'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Difficulty, HikeStatus } from '@prisma/client'
import { revalidateLocalePaths } from '@/lib/i18n'
import { PAYMENT_WINDOW_MS } from '@/lib/expireParticipants'
import { syncHikeRooms } from '@/lib/rooms'
import { resolvePair } from '@/lib/participantPairs'

export async function joinHike(
  hikeId: string,
  friendName?: string,
  bringsCar?: boolean,
  carSeats?: number,
  pickupLat?: number,
  pickupLng?: number,
  agreedToTerms?: boolean,
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const trimmedFriendName = friendName?.trim() || null

  await prisma.$transaction(async (tx) => {
    // Lock the hike row so concurrent joins are serialized
    const hikes = await tx.$queryRaw<{ maxParticipants: number }[]>`
      SELECT "maxParticipants" FROM "Hike" WHERE id = ${hikeId} FOR UPDATE
    `
    if (!hikes.length) throw new Error('Hike not found')

    const confirmed = await tx.hikeParticipant.count({
      where: { hikeId, status: 'confirmed' },
    })

    const neededSpots = trimmedFriendName ? 2 : 1
    const isAdmin = session.user.role === 'admin'
    const isFull = confirmed + neededSpots > hikes[0].maxParticipants
    const status = isAdmin ? 'confirmed' : isFull ? 'waitlist' : 'pending'
    const confirmedAt = isAdmin ? new Date() : undefined
    const paymentDeadline = status === 'pending' ? new Date(Date.now() + PAYMENT_WINDOW_MS) : null

    const host = await tx.hikeParticipant.create({
      data: {
        hikeId,
        userId: session.user.id,
        status,
        confirmedAt,
        paymentDeadline,
        agreedToTermsAt: agreedToTerms ? new Date() : null,
        bringsCar: bringsCar ?? false,
        carSeats: bringsCar && carSeats && carSeats > 0 ? carSeats : null,
        pickupLat: pickupLat ?? null,
        pickupLng: pickupLng ?? null,
      },
    })

    if (trimmedFriendName) {
      await tx.hikeParticipant.create({
        data: {
          hikeId,
          userId: null,
          status,
          confirmedAt,
          paymentDeadline,
          friendName: trimmedFriendName,
          hostParticipantId: host.id,
          bringsCar: false,
          carDriverParticipantId: bringsCar ? host.id : null,
        },
      })
    }
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
    select: { id: true, friend: { select: { id: true, carDriverParticipantId: true } } },
  })
  if (!participation) throw new Error('Registration not found')

  await prisma.$transaction(async (tx) => {
    await tx.hikeParticipant.update({
      where: { id: participation.id },
      data: {
        bringsCar,
        carSeats: bringsCar && carSeats && carSeats > 0 ? carSeats : null,
        ...(pickupLat !== undefined ? { pickupLat } : {}),
        ...(pickupLng !== undefined ? { pickupLng } : {}),
      },
    })

    if (participation.friend) {
      if (bringsCar) {
        await tx.hikeParticipant.update({
          where: { id: participation.friend.id },
          data: { carDriverParticipantId: participation.id },
        })
      } else if (participation.friend.carDriverParticipantId === participation.id) {
        await tx.hikeParticipant.update({
          where: { id: participation.friend.id },
          data: { carDriverParticipantId: null },
        })
      }
    }
  })

  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}

export async function assignCarDriver(hikeId: string, driverParticipantId: string | null) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const participation = await prisma.hikeParticipant.findUnique({
    where: { hikeId_userId: { hikeId, userId: session.user.id } },
    select: { id: true, bringsCar: true, friend: { select: { id: true } } },
  })
  if (!participation) throw new Error('Not registered for this hike')
  if (participation.bringsCar) throw new Error('Drivers cannot join another car')

  const neededSeats = participation.friend ? 2 : 1

  if (driverParticipantId !== null) {
    const driver = await prisma.hikeParticipant.findUnique({
      where: { id: driverParticipantId },
      select: { hikeId: true, bringsCar: true, carSeats: true, hostParticipantId: true, carPassengers: { select: { id: true } } },
    })
    if (!driver || driver.hikeId !== hikeId || !driver.bringsCar || driver.hostParticipantId !== null) throw new Error('Invalid driver')
    const takenSeats = driver.carPassengers.length
    if (driver.carSeats !== null && takenSeats + neededSeats > driver.carSeats) throw new Error('Car is full')
  }

  await prisma.$transaction([
    prisma.hikeParticipant.update({
      where: { id: participation.id },
      data: { carDriverParticipantId: driverParticipantId },
    }),
    ...(participation.friend
      ? [prisma.hikeParticipant.update({
          where: { id: participation.friend.id },
          data: { carDriverParticipantId: driverParticipantId },
        })]
      : []),
  ])

  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}

export async function assignRoom(hikeId: string, roomId: string | null) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const participation = await prisma.hikeParticipant.findUnique({
    where: { hikeId_userId: { hikeId, userId: session.user.id } },
    select: { id: true, friend: { select: { id: true } } },
  })
  if (!participation) throw new Error('Not registered for this hike')

  const friendId = participation.friend?.id ?? null
  const neededSeats = friendId ? 2 : 1

  if (roomId !== null) {
    const room = await prisma.hikeRoom.findUnique({
      where: { id: roomId },
      select: { hikeId: true, capacity: true, occupants: { select: { id: true } } },
    })
    if (!room || room.hikeId !== hikeId) throw new Error('Invalid room')
    const taken = room.occupants.filter(o => o.id !== participation.id && o.id !== friendId).length
    if (taken + neededSeats > room.capacity) throw new Error('Room is full')
  }

  await prisma.$transaction([
    prisma.hikeParticipant.update({ where: { id: participation.id }, data: { roomId } }),
    ...(friendId ? [prisma.hikeParticipant.update({ where: { id: friendId }, data: { roomId } })] : []),
  ])

  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}

export async function adminAssignRoom(hikeId: string, participantId: string, roomId: string | null) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const participant = await prisma.hikeParticipant.findUnique({
    where: { id: participantId },
    select: { hikeId: true },
  })
  if (!participant || participant.hikeId !== hikeId) throw new Error('Invalid participant')

  const { hostId, friendId } = await resolvePair(prisma, participantId)
  const neededSeats = friendId ? 2 : 1

  if (roomId !== null) {
    const room = await prisma.hikeRoom.findUnique({
      where: { id: roomId },
      select: { hikeId: true, capacity: true, occupants: { select: { id: true } } },
    })
    if (!room || room.hikeId !== hikeId) throw new Error('Invalid room')
    const taken = room.occupants.filter(o => o.id !== hostId && o.id !== friendId).length
    if (taken + neededSeats > room.capacity) throw new Error('Room is full')
  }

  await prisma.$transaction([
    prisma.hikeParticipant.update({ where: { id: hostId }, data: { roomId } }),
    ...(friendId ? [prisma.hikeParticipant.update({ where: { id: friendId }, data: { roomId } })] : []),
  ])

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}

export async function createHike(data: {
  title: string
  destination: string
  description?: string
  date: string
  endDate?: string
  meetingTime?: string
  entryFee: number
  maxParticipants: number
  mountainRange?: string
  startingPoint?: string
  meetingPoint?: string
  durationHours?: number
  hasCamping: boolean
  campingDetails?: string
  campingUrl?: string
  campingPrice?: number
  hasAccommodation: boolean
  peoplePerCar?: number
  carsNeeded?: number
  accommodationDetails?: string
  accommodationUrl?: string
  accommodationPrice?: number
  accommodationDeposit?: number
  doubleRoomCount?: number
  tripleRoomCount?: number
  quadrupleRoomCount?: number
  breakfastTime?: string
  dinnerTime?: string
  checkInTime?: string
  checkOutTime?: string
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
      endDate: data.endDate ? new Date(data.endDate) : null,
      meetingTime: data.meetingTime || null,
      entryFee: data.entryFee,
      maxParticipants: data.maxParticipants,
      mountainRange: data.mountainRange || null,
      startingPoint: data.startingPoint || null,
      meetingPoint: data.meetingPoint || null,
      durationHours: data.durationHours ?? null,
      hasCamping: data.hasCamping,
      campingDetails: data.campingDetails || null,
      campingUrl: data.campingUrl || null,
      campingPrice: data.campingPrice ?? null,
      hasAccommodation: data.hasAccommodation,
      peoplePerCar: data.peoplePerCar ?? 5,
      carsNeeded: data.carsNeeded ?? null,
      accommodationDetails: data.accommodationDetails || null,
      accommodationUrl: data.accommodationUrl || null,
      accommodationPrice: data.accommodationPrice ?? null,
      accommodationDeposit: data.accommodationDeposit ?? null,
      doubleRoomCount: data.doubleRoomCount ?? 0,
      tripleRoomCount: data.tripleRoomCount ?? 0,
      quadrupleRoomCount: data.quadrupleRoomCount ?? 0,
      breakfastTime: data.breakfastTime || null,
      dinnerTime: data.dinnerTime || null,
      checkInTime: data.checkInTime || null,
      checkOutTime: data.checkOutTime || null,
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

  await syncHikeRooms(hike.id, {
    doubleRoomCount: data.doubleRoomCount ?? 0,
    tripleRoomCount: data.tripleRoomCount ?? 0,
    quadrupleRoomCount: data.quadrupleRoomCount ?? 0,
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
    endDate?: string | null
    meetingTime?: string | null
    durationHours?: number | null
    difficulty?: string | null
    status?: HikeStatus
    externalPhotosUrl?: string | null
    whatsappGroupUrl?: string | null
    accommodationDetails?: string | null
    accommodationUrl?: string | null
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
    doubleRoomCount?: number
    tripleRoomCount?: number
    quadrupleRoomCount?: number
    breakfastTime?: string | null
    dinnerTime?: string | null
    checkInTime?: string | null
    checkOutTime?: string | null
    hasCamping?: boolean
    campingDetails?: string | null
    campingUrl?: string | null
    campingPrice?: number | null
    hasAccommodation?: boolean
    peoplePerCar?: number
    carsNeeded?: number | null
    essentials?: string[]
  }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const { date, endDate, difficulty, ...rest } = data
  const updated = await prisma.hike.update({
    where: { id: hikeId },
    data: {
      ...rest,
      ...(date ? { date: new Date(date) } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      ...(difficulty !== undefined ? { difficulty: (difficulty as Difficulty | null) } : {}),
    },
  })

  if (data.doubleRoomCount !== undefined || data.tripleRoomCount !== undefined || data.quadrupleRoomCount !== undefined) {
    await syncHikeRooms(hikeId, {
      doubleRoomCount: updated.doubleRoomCount,
      tripleRoomCount: updated.tripleRoomCount,
      quadrupleRoomCount: updated.quadrupleRoomCount,
    })
  }

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
  friendName: string | null
  distanceKm: number | null
}

export type AllocationDriver = {
  driverId: string
  driverName: string
  friendName: string | null
  passengers: AllocationPassenger[]
  remainingSeats: number
}

export type AllocationPreview = {
  drivers: AllocationDriver[]
  unassigned: { id: string; name: string; friendName: string | null }[]
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
      hostParticipantId: true,
      friendName: true,
      friend: { select: { id: true, friendName: true } },
      user: { select: { name: true } },
    },
  })

  const pName = (p: { user: { name: string | null } | null; friendName: string | null }) =>
    p.user?.name ?? p.friendName ?? '?'

  // Friend rows never enter the matching pool independently — they always ride
  // along with whichever driver their host ends up with.
  const hostRows = participants.filter(p => p.hostParticipantId === null)
  const rawDrivers = hostRows.filter(p => p.bringsCar && p.carSeats != null)
  const unassignedPassengers = hostRows.filter(p => !p.bringsCar && p.carDriverParticipantId === null)

  // Track seats already used per driver — this naturally includes a driver's own
  // friend and any already-assigned passenger's friend, since every physical row
  // (host or friend) that points at a driver counts as one occupied seat.
  const seatsUsed = new Map<string, number>()
  for (const p of participants) {
    if (p.carDriverParticipantId) {
      seatsUsed.set(p.carDriverParticipantId, (seatsUsed.get(p.carDriverParticipantId) ?? 0) + 1)
    }
  }

  const drivers = rawDrivers.map(d => ({
    id: d.id,
    name: pName(d),
    friendName: d.friend?.friendName ?? null,
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
    const groupSize = p.friend ? 2 : 1
    const dists = driversWithCoords.map(d => ({
      driverId: d.id,
      dist: haversineKm(p.pickupLat!, p.pickupLng!, d.lat!, d.lng!),
    })).sort((a, b) => a.dist - b.dist)
    return { p, dists, groupSize }
  }).sort((a, b) => (a.dists[0]?.dist ?? Infinity) - (b.dists[0]?.dist ?? Infinity))

  const remaining = new Map(drivers.map(d => [d.id, d.remaining]))

  for (const { p, dists, groupSize } of scored) {
    for (const { driverId, dist } of dists) {
      if ((remaining.get(driverId) ?? 0) >= groupSize) {
        assignments.set(p.id, { driverId, distanceKm: dist })
        remaining.set(driverId, (remaining.get(driverId) ?? groupSize) - groupSize)
        break
      }
    }
    // If no driver with coords has enough seats, fall through to round-robin below
  }

  // Passengers with coords that weren't assigned (no seats in coord-drivers) + passengers without coords
  // → round-robin into any remaining seats
  const needsRoundRobin = [
    ...withCoords.filter(p => !assignments.has(p.id)),
    ...withoutCoords,
  ]
  const allDriversOrdered = [...driversWithoutCoords, ...driversWithCoords]
  for (const p of needsRoundRobin) {
    const groupSize = p.friend ? 2 : 1
    for (const d of allDriversOrdered) {
      if ((remaining.get(d.id) ?? 0) >= groupSize) {
        assignments.set(p.id, { driverId: d.id, distanceKm: null })
        remaining.set(d.id, (remaining.get(d.id) ?? groupSize) - groupSize)
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
          friendName: p.friend?.friendName ?? null,
          distanceKm: assignments.get(p.id)?.distanceKm ?? null,
        }))
      return {
        driverId: d.id,
        driverName: pName(d),
        friendName: d.friend?.friendName ?? null,
        passengers,
        remainingSeats: remaining.get(d.id) ?? 0,
      }
    })

  const unassigned = unassignedPassengers
    .filter(p => !assignments.has(p.id))
    .map(p => ({ id: p.id, name: pName(p), friendName: p.friend?.friendName ?? null }))

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

  const passengers = await prisma.hikeParticipant.findMany({
    where: { id: { in: assignments.map(a => a.passengerId) } },
    select: { id: true, friend: { select: { id: true } } },
  })
  const friendByHost = new Map(passengers.map(p => [p.id, p.friend?.id ?? null]))

  await prisma.$transaction(
    assignments.flatMap(({ passengerId, driverId }) => {
      const updates = [
        prisma.hikeParticipant.update({ where: { id: passengerId }, data: { carDriverParticipantId: driverId } }),
      ]
      const friendId = friendByHost.get(passengerId)
      if (friendId) {
        updates.push(prisma.hikeParticipant.update({ where: { id: friendId }, data: { carDriverParticipantId: driverId } }))
      }
      return updates
    })
  )

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}
