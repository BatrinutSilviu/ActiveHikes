export type ParticipantCounts = { confirmedCount: number; maxParticipants: number; waitlistCount: number }
export type ParticipantsLineDict = { confirmed: string; onWaitlist: string }

/** "x/y confirmed · n on waitlist" */
export default function ParticipantsLine({ counts, dict }: { counts: ParticipantCounts; dict: ParticipantsLineDict }) {
  return (
    <>
      {counts.confirmedCount}/{counts.maxParticipants} {dict.confirmed}
      {counts.waitlistCount > 0 && (
        <span className="text-stone-400 text-sm ml-1">· {counts.waitlistCount} {dict.onWaitlist}</span>
      )}
    </>
  )
}
