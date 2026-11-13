'use client'

import { useLiveSpots } from '@/hooks/useLiveSpots'
import ParticipantsLine, { type ParticipantCounts, type ParticipantsLineDict } from './ParticipantsLine'

/** The participants line, kept live while the event is open for registration. */
export default function ParticipantsCount({
  spotsUrl,
  initial,
  dict,
}: {
  spotsUrl: string
  initial: ParticipantCounts
  dict: ParticipantsLineDict
}) {
  return <ParticipantsLine counts={useLiveSpots(spotsUrl, initial)} dict={dict} />
}
