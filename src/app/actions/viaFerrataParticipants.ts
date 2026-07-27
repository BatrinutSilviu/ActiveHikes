'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ParticipantStatus } from '@prisma/client'
import { PAYMENT_WINDOW_MS } from '@/lib/expireParticipants'
import { resolveViaFerrataPair } from '@/lib/viaFerrataParticipantPairs'
import { revalidateViaFerrataParticipantCountPaths } from '@/lib/revalidateViaFerrata'

export async function updateViaFerrataParticipantStatus(
  participantId: string,
  newStatus: ParticipantStatus,
  viaFerrataId: string
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const { hostId, friendId } = await resolveViaFerrataPair(prisma, participantId)

  await prisma.viaFerrataParticipant.updateMany({
    where: { id: { in: [hostId, friendId].filter((id): id is string => id !== null) } },
    data: {
      status: newStatus,
      confirmedAt: newStatus === 'confirmed' ? new Date() : undefined,
      paymentDeadline: newStatus === 'pending' ? new Date(Date.now() + PAYMENT_WINDOW_MS) : null,
    },
  })

  revalidateViaFerrataParticipantCountPaths(viaFerrataId)
}

export async function removeViaFerrataFriend(viaFerrataId: string, hostParticipantId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const host = await prisma.viaFerrataParticipant.findUnique({
    where: { id: hostParticipantId },
    select: { viaFerrataId: true },
  })
  if (!host || host.viaFerrataId !== viaFerrataId) throw new Error('Invalid participant')

  await prisma.viaFerrataParticipant.delete({ where: { hostParticipantId } })

  revalidateViaFerrataParticipantCountPaths(viaFerrataId)
}

export async function adminAddViaFerrataParticipant(viaFerrataId: string, email: string): Promise<{ status: ParticipantStatus }> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const user = await prisma.user.findFirst({ where: { email: { equals: email.trim(), mode: 'insensitive' } } })
  if (!user) throw new Error('No account found with that email')

  const existing = await prisma.viaFerrataParticipant.findUnique({
    where: { viaFerrataId_userId: { viaFerrataId, userId: user.id } },
  })
  if (existing) throw new Error('This user is already registered for this event')

  const viaFerrata = await prisma.viaFerrata.findUnique({ where: { id: viaFerrataId }, select: { maxParticipants: true } })
  if (!viaFerrata) throw new Error('Via Ferrata event not found')

  const confirmedCount = await prisma.viaFerrataParticipant.count({ where: { viaFerrataId, status: 'confirmed' } })
  const status: ParticipantStatus = confirmedCount < viaFerrata.maxParticipants ? 'confirmed' : 'waitlist'

  await prisma.viaFerrataParticipant.create({
    data: {
      viaFerrataId,
      userId: user.id,
      status,
      confirmedAt: status === 'confirmed' ? new Date() : undefined,
    },
  })

  revalidateViaFerrataParticipantCountPaths(viaFerrataId)

  return { status }
}

export async function adminImportViaFerrataParticipant(viaFerrataId: string, name: string): Promise<{ id: string }> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Name is required')

  const viaFerrata = await prisma.viaFerrata.findUnique({ where: { id: viaFerrataId }, select: { id: true } })
  if (!viaFerrata) throw new Error('Via Ferrata event not found')

  const participant = await prisma.viaFerrataParticipant.create({
    data: {
      viaFerrataId,
      userId: null,
      friendName: trimmedName,
      status: 'confirmed',
      confirmedAt: new Date(),
    },
  })

  revalidateViaFerrataParticipantCountPaths(viaFerrataId)

  return { id: participant.id }
}

export async function confirmAllPendingViaFerrata(viaFerrataId: string): Promise<{ confirmed: number }> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const [viaFerrata, alreadyConfirmed, pendingHosts] = await Promise.all([
    prisma.viaFerrata.findUnique({ where: { id: viaFerrataId }, select: { maxParticipants: true } }),
    prisma.viaFerrataParticipant.count({ where: { viaFerrataId, status: 'confirmed' } }),
    prisma.viaFerrataParticipant.findMany({
      where: { viaFerrataId, status: 'pending', hostParticipantId: null },
      orderBy: { joinedAt: 'asc' },
      select: { id: true, friend: { select: { id: true } } },
    }),
  ])

  if (!viaFerrata) throw new Error('Via Ferrata event not found')

  const spotsLeft = viaFerrata.maxParticipants - alreadyConfirmed
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

  await prisma.viaFerrataParticipant.updateMany({
    where: { id: { in: idsToConfirm } },
    data: { status: 'confirmed', confirmedAt: new Date() },
  })

  revalidateViaFerrataParticipantCountPaths(viaFerrataId)
  return { confirmed: idsToConfirm.length }
}
