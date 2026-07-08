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
