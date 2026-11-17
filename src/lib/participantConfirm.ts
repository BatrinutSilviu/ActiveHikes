import { prisma } from '@/lib/db'
import { resolvePair } from '@/lib/participantPairs'
import { revalidateParticipantCountPaths } from '@/lib/revalidateHike'
import { logged, type LogAction, type LogActor } from '@/lib/participantLog'

// Shared by the admin "confirm" action and the automated Revolut-payment
// matcher. Deliberately has no session/auth check of its own — callers are
// responsible for authorizing the confirmation (admin session, or a payment
// match) before calling this.
// `why` is what the participant history records: an admin confirming, or a payment (matched by the sync,
// or assigned by an admin).
export async function confirmParticipant(
  participantId: string,
  hikeId: string,
  why: { action: Extract<LogAction, 'status' | 'payment'>; actor: LogActor; amount?: number },
) {
  const { hostId, friendId } = await resolvePair(prisma, participantId)
  const ids = [hostId, friendId].filter((id): id is string => id !== null)

  await logged(ids, { action: why.action, actor: why.actor, toStatus: 'confirmed', details: why.amount != null ? { amount: why.amount } : undefined },
    () => prisma.hikeParticipant.updateMany({
      where: { id: { in: ids } },
      data: { status: 'confirmed', confirmedAt: new Date() },
    }))

  revalidateParticipantCountPaths(hikeId)
}
