import { prisma } from '@/lib/db'
import { friendCoveredByPayment, resolvePair } from '@/lib/participantPairs'
import { revalidateParticipantCountPaths } from '@/lib/revalidateHike'
import { logged, type LogAction, type LogActor } from '@/lib/participantLog'

// Shared by the admin "confirm" action and the automated Revolut-payment
// matcher. Deliberately has no session/auth check of its own — callers are
// responsible for authorizing the confirmation (admin session, or a payment
// match) before calling this.
// `why` is what the participant history records: an admin confirming, or a payment (matched by the sync,
// or assigned by an admin).
// An admin changing a status confirms just that person; a payment also confirms the friend the host
// signed up, as long as the friend is still waiting (not rejected or already confirmed on their own).
export async function confirmParticipant(
  participantId: string,
  hikeId: string,
  why: { action: Extract<LogAction, 'status' | 'payment'>; actor: LogActor; amount?: number },
) {
  const ids = [participantId]
  if (why.action === 'payment') {
    const { friendId } = await resolvePair(prisma, participantId)
    if (friendId && friendId !== participantId) {
      const friend = await prisma.hikeParticipant.findUnique({ where: { id: friendId }, select: { status: true } })
      if (friendCoveredByPayment(friend)) ids.push(friendId)
    }
  }

  await logged(ids, { action: why.action, actor: why.actor, toStatus: 'confirmed', details: why.amount != null ? { amount: why.amount } : undefined },
    () => prisma.hikeParticipant.updateMany({
      where: { id: { in: ids } },
      data: { status: 'confirmed', confirmedAt: new Date() },
    }))

  revalidateParticipantCountPaths(hikeId)
}
