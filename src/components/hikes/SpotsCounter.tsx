'use client'

import { useEffect, useState } from 'react'

type Spots = {
  confirmedCount: number
  maxParticipants: number
  spotsLeft: number
  isFull: boolean
  waitlistCount: number
}

type SpotsDict = {
  full: string
  spotsLeft: string
  oneSpotLeft: string
  confirmed: string
  onWaitlist: string
}

export default function SpotsCounter({
  hikeId,
  initial,
  dict,
}: {
  hikeId: string
  initial: Spots
  dict: SpotsDict
}) {
  const [spots, setSpots] = useState(initial)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/hikes/${hikeId}/spots`, { cache: 'no-store' })
        if (res.ok) setSpots(await res.json())
      } catch {
        // silent — stale data is fine, we'll retry
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [hikeId])

  const pct = Math.min((spots.confirmedCount / spots.maxParticipants) * 100, 100)
  const spotsLabel = spots.spotsLeft === 1 ? dict.oneSpotLeft : `${spots.spotsLeft} ${dict.spotsLeft}`

  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-stone-600">{spots.confirmedCount} {dict.confirmed}</span>
        <span className={spots.isFull ? 'text-red-600 font-medium' : 'text-stone-600'}>
          {spots.isFull ? dict.full : spotsLabel}
        </span>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-2">
        <div
          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {spots.waitlistCount > 0 && (
        <p className="text-center text-stone-400 text-xs mt-2">{spots.waitlistCount} {dict.onWaitlist}</p>
      )}
    </div>
  )
}
