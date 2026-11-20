import type { Prisma, PrismaClient } from '@prisma/client'

type Tx = PrismaClient | Prisma.TransactionClient

/**
 * Given either a host's or a friend's HikeParticipant id, resolves the full pair.
 * `friendId` is null when the participant did not bring a friend.
 */
export async function resolvePair(
  tx: Tx,
  participantId: string,
): Promise<{ hostId: string; friendId: string | null }> {
  const participant = await tx.hikeParticipant.findUnique({
    where: { id: participantId },
    select: { id: true, hostParticipantId: true, friend: { select: { id: true } } },
  })
  if (!participant) throw new Error('Participant not found')

  if (participant.hostParticipantId) {
    return { hostId: participant.hostParticipantId, friendId: participant.id }
  }
  return { hostId: participant.id, friendId: participant.friend?.id ?? null }
}

/**
 * Groups sign-ups that share a status into the units that should move together: a host and the
 * friend they brought form one unit while both are in the list, anyone else (including a friend
 * whose host is in another status, since admins handle people individually) is a unit of one.
 * Keeps the order of `rows` (the first member of each unit decides its place).
 */
export function groupIntoUnits(rows: { id: string; hostParticipantId: string | null }[]): string[][] {
  const units = new Map<string, string[]>()
  for (const r of rows) {
    const key = r.hostParticipantId && rows.some(h => h.id === r.hostParticipantId) ? r.hostParticipantId : r.id
    const unit = units.get(key)
    if (unit) unit.push(r.id)
    else units.set(key, [r.id])
  }
  return [...units.values()]
}

/** Whether a host's payment still covers their friend: the friend is waiting to be confirmed too. */
export function friendCoveredByPayment(friend: { status: string } | null | undefined): boolean {
  return !!friend && (friend.status === 'pending' || friend.status === 'waitlist')
}
