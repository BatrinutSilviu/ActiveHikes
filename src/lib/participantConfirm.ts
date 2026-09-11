import { prisma } from '@/lib/db'
import { resolvePair } from '@/lib/participantPairs'
import { revalidateParticipantCountPaths } from '@/lib/revalidateHike'

// Shared by the admin "confirm" action and the automated Revolut-payment
// matcher. Deliberately has no session/auth check of its own — callers are
// responsible for authorizing the confirmation (admin session, or a payment
// match) before calling this.
export async function confirmParticipant(participantId: string, hikeId: string) {
  const { hostId, friendId } = await resolvePair(prisma, participantId)

  await prisma.hikeParticipant.updateMany({
    where: { id: { in: [hostId, friendId].filter((id): id is string => id !== null) } },
    data: { status: 'confirmed', confirmedAt: new Date() },
  })

  revalidateParticipantCountPaths(hikeId)
}
