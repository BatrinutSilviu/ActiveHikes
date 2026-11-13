import type { Prisma } from '@prisma/client'

/** What the admin event pages load for each participant. */
export const managedParticipantInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  friend: { select: { id: true, friendName: true } },
  host: { select: { id: true, user: { select: { name: true } } } },
} satisfies Prisma.HikeParticipantInclude

type ManagedParticipantRow = Prisma.HikeParticipantGetPayload<{ include: typeof managedParticipantInclude }>

/** Serializable participant for the admin participant list and the WhatsApp group check. */
export function toManagedParticipant(p: ManagedParticipantRow) {
  return {
    id: p.id,
    userId: p.userId,
    status: p.status,
    joinedAt: p.joinedAt.toISOString(),
    paymentDeadline: p.paymentDeadline ? p.paymentDeadline.toISOString() : null,
    adminNotes: p.adminNotes,
    friendName: p.friendName,
    hostParticipantId: p.hostParticipantId,
    hostName: p.host?.user?.name ?? null,
    linkedFriend: p.friend ? { id: p.friend.id, name: p.friend.friendName } : null,
    user: p.user,
  }
}
