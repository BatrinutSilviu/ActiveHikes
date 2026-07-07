'use client'

import { useEffect, useState } from 'react'

type Counts = { confirmedCount: number; maxParticipants: number; waitlistCount: number }

export default function ParticipantsCount({
  hikeId,
  initial,
  dict,
}: {
  hikeId: string
  initial: Counts
  dict: { confirmed: string; onWaitlist: string }
}) {
  const [counts, setCounts] = useState(initial)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/hikes/${hikeId}/spots`, { cache: 'no-store' })
        if (res.ok) setCounts(await res.json())
      } catch {
        // silent
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [hikeId])

  return (
    <>
      {counts.confirmedCount}/{counts.maxParticipants} {dict.confirmed}
      {counts.waitlistCount > 0 && (
        <span className="text-stone-400 text-sm ml-1">· {counts.waitlistCount} {dict.onWaitlist}</span>
      )}
    </>
  )
}
