'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/net'

type Counts = { confirmedCount: number; maxParticipants: number; waitlistCount: number }

// Polled every 5s, so a failed poll isn't retried — the next one is the retry.
const POLL = { timeoutMs: 4000, retries: 0 }

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
        const res = await apiFetch(`/api/hikes/${hikeId}/spots`, { cache: 'no-store', ...POLL })
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
