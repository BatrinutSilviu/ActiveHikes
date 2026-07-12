'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { ParticipantStatus } from '@prisma/client'
import { revalidateLocalePaths } from '@/lib/i18n'
import { PAYMENT_WINDOW_MS } from '@/lib/expireParticipants'
import { resolvePair } from '@/lib/participantPairs'

export async function updateParticipantStatus(
  participantId: string,
  newStatus: ParticipantStatus,
  hikeId: string
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const { hostId, friendId } = await resolvePair(prisma, participantId)

  await prisma.hikeParticipant.updateMany({
    where: { id: { in: [hostId, friendId].filter((id): id is string => id !== null) } },
    data: {
      status: newStatus,
      confirmedAt: newStatus === 'confirmed' ? new Date() : undefined,
      paymentDeadline: newStatus === 'pending' ? new Date(Date.now() + PAYMENT_WINDOW_MS) : null,
    },
  })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
}

export async function removeFriend(hikeId: string, hostParticipantId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const host = await prisma.hikeParticipant.findUnique({
    where: { id: hostParticipantId },
    select: { hikeId: true },
  })
  if (!host || host.hikeId !== hikeId) throw new Error('Invalid participant')

  await prisma.hikeParticipant.delete({ where: { hostParticipantId } })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}

export async function adminAddParticipant(hikeId: string, email: string): Promise<{ status: ParticipantStatus }> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const user = await prisma.user.findFirst({ where: { email: { equals: email.trim(), mode: 'insensitive' } } })
  if (!user) throw new Error('No account found with that email')

  const existing = await prisma.hikeParticipant.findUnique({
    where: { hikeId_userId: { hikeId, userId: user.id } },
  })
  if (existing) throw new Error('This user is already registered for this hike')

  const hike = await prisma.hike.findUnique({ where: { id: hikeId }, select: { maxParticipants: true } })
  if (!hike) throw new Error('Hike not found')

  const confirmedCount = await prisma.hikeParticipant.count({ where: { hikeId, status: 'confirmed' } })
  const status: ParticipantStatus = confirmedCount < hike.maxParticipants ? 'confirmed' : 'waitlist'

  await prisma.hikeParticipant.create({
    data: {
      hikeId,
      userId: user.id,
      status,
      confirmedAt: status === 'confirmed' ? new Date() : undefined,
    },
  })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)

  return { status }
}

export async function adminImportParticipant(hikeId: string, name: string): Promise<{ id: string }> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Name is required')

  const hike = await prisma.hike.findUnique({ where: { id: hikeId }, select: { id: true } })
  if (!hike) throw new Error('Hike not found')

  const participant = await prisma.hikeParticipant.create({
    data: {
      hikeId,
      userId: null,
      friendName: trimmedName,
      status: 'confirmed',
      confirmedAt: new Date(),
    },
  })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)

  return { id: participant.id }
}

export async function confirmAllPending(hikeId: string): Promise<{ confirmed: number }> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const [hike, alreadyConfirmed, pendingHosts] = await Promise.all([
    prisma.hike.findUnique({ where: { id: hikeId }, select: { maxParticipants: true } }),
    prisma.hikeParticipant.count({ where: { hikeId, status: 'confirmed' } }),
    prisma.hikeParticipant.findMany({
      where: { hikeId, status: 'pending', hostParticipantId: null },
      orderBy: { joinedAt: 'asc' },
      select: { id: true, friend: { select: { id: true } } },
    }),
  ])

  if (!hike) throw new Error('Hike not found')

  const spotsLeft = hike.maxParticipants - alreadyConfirmed
  const idsToConfirm: string[] = []
  let spotsUsed = 0
  for (const host of pendingHosts) {
    const unitSize = host.friend ? 2 : 1
    if (spotsUsed + unitSize > spotsLeft) break
    idsToConfirm.push(host.id)
    if (host.friend) idsToConfirm.push(host.friend.id)
    spotsUsed += unitSize
  }

  if (idsToConfirm.length === 0) return { confirmed: 0 }

  await prisma.hikeParticipant.updateMany({
    where: { id: { in: idsToConfirm } },
    data: { status: 'confirmed', confirmedAt: new Date() },
  })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  return { confirmed: idsToConfirm.length }
}
