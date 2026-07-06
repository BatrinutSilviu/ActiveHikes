'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Difficulty, HikeStatus } from '@prisma/client'
import { revalidateLocalePaths } from '@/lib/i18n'
import { PAYMENT_WINDOW_MS } from '@/lib/expireParticipants'

export async function joinHike(hikeId: string, guestName?: string, bringsCar?: boolean, carSeats?: number, pickupLat?: number, pickupLng?: number) {
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
    const status = isAdmin ? 'confirmed' : isFull ? 'waitlist' : 'pending'

    await tx.hikeParticipant.create({
      data: {
        hikeId,
        userId: session.user.id,
        status,
        confirmedAt: isAdmin ? new Date() : undefined,
        paymentDeadline: status === 'pending' ? new Date(Date.now() + PAYMENT_WINDOW_MS) : null,
        guestName: guestName?.trim() || null,
        bringsCar: bringsCar ?? false,
        carSeats: bringsCar && carSeats && carSeats > 0 ? carSeats : null,
        pickupLat: pickupLat ?? null,
        pickupLng: pickupLng ?? null,
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

export async function updateCarPreference(hikeId: string, bringsCar: boolean, carSeats?: number, pickupLat?: number | null, pickupLng?: number | null) {
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
      ...(pickupLat !== undefined ? { pickupLat } : {}),
      ...(pickupLng !== undefined ? { pickupLng } : {}),
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
  essentials?: string[]
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
      essentials: data.essentials ?? [],
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
    essentials?: string[]
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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export type AllocationPassenger = {
  passengerId: string
  passengerName: string
  distanceKm: number | null
}

export type AllocationDriver = {
  driverId: string
  driverName: string
  passengers: AllocationPassenger[]
  remainingSeats: number
}

export type AllocationPreview = {
  drivers: AllocationDriver[]
  unassigned: { id: string; name: string }[]
  noLocationCount: number
}

export async function previewCarAllocation(hikeId: string): Promise<AllocationPreview> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const participants = await prisma.hikeParticipant.findMany({
    where: { hikeId, status: 'confirmed' },
    select: {
      id: true,
      bringsCar: true,
      carSeats: true,
      carDriverParticipantId: true,
      pickupLat: true,
      pickupLng: true,
      guestName: true,
      user: { select: { name: true } },
    },
  })

  const pName = (p: { user: { name: string | null }; guestName: string | null }) =>
    p.user.name ?? '?'

  const rawDrivers = participants.filter(p => p.bringsCar && p.carSeats != null)
  const unassignedPassengers = participants.filter(p => !p.bringsCar && p.carDriverParticipantId === null)

  // Track remaining seats per driver (pre-fill with already-assigned passengers not touched here)
  const alreadyAssigned = participants.filter(p => !p.bringsCar && p.carDriverParticipantId !== null)
  const seatsUsed = new Map<string, number>()
  for (const p of alreadyAssigned) {
    if (p.carDriverParticipantId) {
      seatsUsed.set(p.carDriverParticipantId, (seatsUsed.get(p.carDriverParticipantId) ?? 0) + 1)
    }
  }

  const drivers = rawDrivers.map(d => ({
    id: d.id,
    name: pName(d),
    lat: d.pickupLat,
    lng: d.pickupLng,
    remaining: (d.carSeats ?? 0) - (seatsUsed.get(d.id) ?? 0),
  })).filter(d => d.remaining > 0)

  // Separate passengers into those with and without coordinates
  const withCoords = unassignedPassengers.filter(p => p.pickupLat != null && p.pickupLng != null)
  const withoutCoords = unassignedPassengers.filter(p => p.pickupLat == null || p.pickupLng == null)

  const assignments = new Map<string, { driverId: string; distanceKm: number | null }>()

  // For each passenger with coords, compute distance to each driver that also has coords
  const driversWithCoords = drivers.filter(d => d.lat != null && d.lng != null)
  const driversWithoutCoords = drivers.filter(d => d.lat == null || d.lng == null)

  // Sort passengers by distance to nearest available driver (ascending) so closest pairs get priority
  const scored = withCoords.map(p => {
    const dists = driversWithCoords.map(d => ({
      driverId: d.id,
      dist: haversineKm(p.pickupLat!, p.pickupLng!, d.lat!, d.lng!),
    })).sort((a, b) => a.dist - b.dist)
    return { p, dists }
  }).sort((a, b) => (a.dists[0]?.dist ?? Infinity) - (b.dists[0]?.dist ?? Infinity))

  const remaining = new Map(drivers.map(d => [d.id, d.remaining]))

  for (const { p, dists } of scored) {
    for (const { driverId, dist } of dists) {
      if ((remaining.get(driverId) ?? 0) > 0) {
        assignments.set(p.id, { driverId, distanceKm: dist })
        remaining.set(driverId, (remaining.get(driverId) ?? 1) - 1)
        break
      }
    }
    // If no driver with coords has seats, fall through to round-robin below
  }

  // Passengers with coords that weren't assigned (no seats in coord-drivers) + passengers without coords
  // → round-robin into any remaining seats
  const needsRoundRobin = [
    ...withCoords.filter(p => !assignments.has(p.id)),
    ...withoutCoords,
  ]
  const allDriversOrdered = [...driversWithoutCoords, ...driversWithCoords]
  for (const p of needsRoundRobin) {
    for (const d of allDriversOrdered) {
      if ((remaining.get(d.id) ?? 0) > 0) {
        assignments.set(p.id, { driverId: d.id, distanceKm: null })
        remaining.set(d.id, (remaining.get(d.id) ?? 1) - 1)
        break
      }
    }
  }

  // Build result grouped by driver
  const resultDrivers: AllocationDriver[] = rawDrivers
    .filter(d => (d.carSeats ?? 0) - (seatsUsed.get(d.id) ?? 0) > 0 || [...assignments.values()].some(a => a.driverId === d.id))
    .map(d => {
      const passengers = unassignedPassengers
        .filter(p => assignments.get(p.id)?.driverId === d.id)
        .map(p => ({
          passengerId: p.id,
          passengerName: pName(p),
          distanceKm: assignments.get(p.id)?.distanceKm ?? null,
        }))
      return {
        driverId: d.id,
        driverName: pName(d),
        passengers,
        remainingSeats: remaining.get(d.id) ?? 0,
      }
    })

  const unassigned = unassignedPassengers
    .filter(p => !assignments.has(p.id))
    .map(p => ({ id: p.id, name: pName(p) }))

  return {
    drivers: resultDrivers,
    unassigned,
    noLocationCount: withoutCoords.length,
  }
}

export async function applyCarAllocation(
  hikeId: string,
  assignments: { passengerId: string; driverId: string }[]
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  await prisma.$transaction(
    assignments.map(({ passengerId, driverId }) =>
      prisma.hikeParticipant.update({
        where: { id: passengerId },
        data: { carDriverParticipantId: driverId },
      })
    )
  )

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}
