import type { ParticipantStatus } from '@prisma/client'

type CountedParticipant = { status: ParticipantStatus; userId: string | null }

/** Head counts shown on the event pages. Only confirmed participants take a spot. */
export function participantStats(participants: CountedParticipant[], maxParticipants: number) {
  const confirmedCount = participants.filter(p => p.status === 'confirmed').length
  const waitlistCount = participants.filter(p => p.status === 'waitlist').length
  const spotsLeft = maxParticipants - confirmedCount
  return { confirmedCount, waitlistCount, spotsLeft, isFull: spotsLeft <= 0 }
}

/** 1-based place in the waitlist (in join order) of a user who is on it, otherwise null. */
export function waitlistPosition(
  participants: CountedParticipant[],
  userId: string | null | undefined,
  status: ParticipantStatus | null | undefined,
): number | null {
  if (status !== 'waitlist') return null
  return participants.filter(p => p.status === 'waitlist').findIndex(p => p.userId === userId) + 1
}
