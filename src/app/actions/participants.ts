'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { ParticipantStatus } from '@prisma/client'
import { revalidateLocalePaths } from '@/lib/i18n'
import { PAYMENT_WINDOW_MS } from '@/lib/expireParticipants'

export async function updateParticipantStatus(
  participantId: string,
  newStatus: ParticipantStatus,
  hikeId: string
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  await prisma.hikeParticipant.update({
    where: { id: participantId },
    data: {
      status: newStatus,
      confirmedAt: newStatus === 'confirmed' ? new Date() : undefined,
      paymentDeadline: newStatus === 'pending' ? new Date(Date.now() + PAYMENT_WINDOW_MS) : null,
    },
  })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
}

export async function confirmAllPending(hikeId: string): Promise<{ confirmed: number }> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const [hike, alreadyConfirmed, pending] = await Promise.all([
    prisma.hike.findUnique({ where: { id: hikeId }, select: { maxParticipants: true } }),
    prisma.hikeParticipant.count({ where: { hikeId, status: 'confirmed' } }),
    prisma.hikeParticipant.findMany({
      where: { hikeId, status: 'pending' },
      orderBy: { joinedAt: 'asc' },
      select: { id: true },
    }),
  ])

  if (!hike) throw new Error('Hike not found')

  const spotsLeft = hike.maxParticipants - alreadyConfirmed
  const toConfirm = pending.slice(0, Math.max(spotsLeft, 0))

  if (toConfirm.length === 0) return { confirmed: 0 }

  await prisma.hikeParticipant.updateMany({
    where: { id: { in: toConfirm.map(p => p.id) } },
    data: { status: 'confirmed', confirmedAt: new Date() },
  })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  return { confirmed: toConfirm.length }
}
