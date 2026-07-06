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
        // silent
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [hikeId])

  const pct = Math.min((spots.confirmedCount / spots.maxParticipants) * 100, 100)
  const spotsLabel = spots.spotsLeft === 1 ? dict.oneSpotLeft : `${spots.spotsLeft} ${dict.spotsLeft}`

  return (
    <div className="mb-5">
      <div className="flex justify-between text-sm font-medium mb-2">
        <span className="text-stone-600">{spots.confirmedCount} / {spots.maxParticipants} {dict.confirmed}</span>
        <span className={spots.isFull ? 'text-red-500 font-semibold' : 'text-stone-400'}>
          {spots.isFull ? dict.full : spotsLabel}
        </span>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${spots.isFull ? 'bg-red-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {spots.waitlistCount > 0 && (
        <p className="text-center text-stone-400 text-xs mt-2">{spots.waitlistCount} {dict.onWaitlist}</p>
      )}
    </div>
  )
}
