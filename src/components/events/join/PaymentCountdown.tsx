'use client'

import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'

const URGENT_BELOW_MS = 15 * 60 * 1000

/** Time left to pay before a pending registration expires and the spot is released. */
export default function PaymentCountdown({
  deadline,
  dict,
}: {
  deadline: string
  dict: { payWithin: string; paymentWindowExpired: string }
}) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(deadline).getTime() - Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(new Date(deadline).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  if (remainingMs <= 0) return <p className="text-sm mt-2 font-semibold">{dict.paymentWindowExpired}</p>

  const totalSeconds = Math.floor(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const urgent = remainingMs < URGENT_BELOW_MS

  return (
    <p className={`text-sm mt-2 font-semibold flex items-center justify-center gap-1.5 ${urgent ? 'text-red-600' : ''}`}>
      <Timer size={14} />
      {dict.payWithin} {hours}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s
    </p>
  )
}
