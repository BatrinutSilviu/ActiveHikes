'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Difficulty, HikeStatus } from '@prisma/client'
import { revalidateLocalePaths } from '@/lib/i18n'

export async function joinHike(hikeId: string, guestName?: string, bringsCar?: boolean, carSeats?: number) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  await prisma.$transaction(async (tx) => {
    // Lock the hike row so concurrent joins are serialized
    const hikes = await tx.$queryRaw<{ maxParticipants: number }[]>`
      SELECT "maxParticipants" FROM "Hike" WHERE id = ${hikeId} FOR UPDATE
    `
    if (!hikes.length) throw new Error('Hike not found')

    const confirmed = await tx.hikeParticipant.count({
      where: { hikeId, status: 'confirmed' },
    })

    const isAdmin = session.user.role === 'admin'
    const isFull = confirmed >= hikes[0].maxParticipants

    await tx.hikeParticipant.create({
      data: {
        hikeId,
        userId: session.user.id,
        status: isAdmin ? 'confirmed' : isFull ? 'waitlist' : 'pending',
        confirmedAt: isAdmin ? new Date() : undefined,
        guestName: guestName?.trim() || null,
        bringsCar: bringsCar ?? false,
        carSeats: bringsCar && carSeats && carSeats > 0 ? carSeats : null,
      },
    })
  })

  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}

export async function cancelRegistration(hikeId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const participation = await prisma.hikeParticipant.findUnique({
    where: { hikeId_userId: { hikeId, userId: session.user.id } },
    select: { id: true, status: true },
  })

  if (!participation) throw new Error('Registration not found')
  if (participation.status === 'confirmed') throw new Error('Confirmed registrations cannot be cancelled')

  await prisma.hikeParticipant.delete({ where: { id: participation.id } })

  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}

export async function updateCarPreference(hikeId: string, bringsCar: boolean, carSeats?: number) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const participation = await prisma.hikeParticipant.findUnique({
    where: { hikeId_userId: { hikeId, userId: session.user.id } },
    select: { id: true },
  })
  if (!participation) throw new Error('Registration not found')

  await prisma.hikeParticipant.update({
    where: { id: participation.id },
    data: {
      bringsCar,
      carSeats: bringsCar && carSeats && carSeats > 0 ? carSeats : null,
    },
  })

  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}

export async function assignCarDriver(hikeId: string, driverParticipantId: string | null) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const participation = await prisma.hikeParticipant.findUnique({
    where: { hikeId_userId: { hikeId, userId: session.user.id } },
    select: { id: true, bringsCar: true },
  })
  if (!participation) throw new Error('Not registered for this hike')
  if (participation.bringsCar) throw new Error('Drivers cannot join another car')

  if (driverParticipantId !== null) {
    const driver = await prisma.hikeParticipant.findUnique({
      where: { id: driverParticipantId },
      select: { hikeId: true, bringsCar: true, carSeats: true, carPassengers: { select: { id: true } } },
    })
    if (!driver || driver.hikeId !== hikeId || !driver.bringsCar) throw new Error('Invalid driver')
    const takenSeats = driver.carPassengers.length
    if (driver.carSeats !== null && takenSeats >= driver.carSeats) throw new Error('Car is full')
  }

  await prisma.hikeParticipant.update({
    where: { id: participation.id },
    data: { carDriverParticipantId: driverParticipantId },
  })

  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}

export async function createHike(data: {
  title: string
  destination: string
  description?: string
  date: string
  meetingTime?: string
  entryFee: number
  maxParticipants: number
  mountainRange?: string
  startingPoint?: string
  meetingPoint?: string
  durationHours?: number
  hasCamping: boolean
  campingDetails?: string
  campingPrice?: number
  hasAccommodation: boolean
  peoplePerCar?: number
  carsNeeded?: number
  accommodationDetails?: string
  accommodationPrice?: number
  accommodationDeposit?: number
  difficulty?: string
  coverImageUrl?: string
  gpxApproximateUrl?: string
  externalPhotosUrl?: string
  whatsappGroupUrl?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const hike = await prisma.hike.create({
    data: {
      title: data.title,
      destination: data.destination,
      description: data.description || null,
      date: new Date(data.date),
      meetingTime: data.meetingTime || null,
      entryFee: data.entryFee,
      maxParticipants: data.maxParticipants,
      mountainRange: data.mountainRange || null,
      startingPoint: data.startingPoint || null,
      meetingPoint: data.meetingPoint || null,
      durationHours: data.durationHours ?? null,
      hasCamping: data.hasCamping,
      campingDetails: data.campingDetails || null,
      campingPrice: data.campingPrice ?? null,
      hasAccommodation: data.hasAccommodation,
      peoplePerCar: data.peoplePerCar ?? 5,
      carsNeeded: data.carsNeeded ?? null,
      accommodationDetails: data.accommodationDetails || null,
      accommodationPrice: data.accommodationPrice ?? null,
      accommodationDeposit: data.accommodationDeposit ?? null,
      difficulty: (data.difficulty as Difficulty) || null,
      coverImageUrl: data.coverImageUrl || null,
      gpxApproximateUrl: data.gpxApproximateUrl || null,
      externalPhotosUrl: data.externalPhotosUrl || null,
      whatsappGroupUrl: data.whatsappGroupUrl || null,
      status: 'upcoming',
      createdById: session.user.id,
    },
  })

  return hike.id
}

export async function updateHike(
  hikeId: string,
  data: {
    title?: string
    destination?: string
    description?: string | null
    date?: string
    meetingTime?: string | null
    durationHours?: number | null
    difficulty?: string | null
    status?: HikeStatus
    externalPhotosUrl?: string | null
    whatsappGroupUrl?: string | null
    accommodationDetails?: string | null
    entryFee?: number
    maxParticipants?: number
    gpxActualUrl?: string | null
    gpxApproximateUrl?: string | null
    coverImageUrl?: string | null
    mountainRange?: string | null
    meetingPoint?: string | null
    startingPoint?: string | null
    accommodationPrice?: number | null
    accommodationDeposit?: number | null
    hasCamping?: boolean
    campingDetails?: string | null
    campingPrice?: number | null
    hasAccommodation?: boolean
    peoplePerCar?: number
    carsNeeded?: number | null
  }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const { date, difficulty, ...rest } = data
  await prisma.hike.update({
    where: { id: hikeId },
    data: {
      ...rest,
      ...(date ? { date: new Date(date) } : {}),
      ...(difficulty !== undefined ? { difficulty: (difficulty as Difficulty | null) } : {}),
    },
  })
  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}
