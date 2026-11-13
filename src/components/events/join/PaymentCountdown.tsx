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
  // Unknown until mounted: the server's clock (and render time) differs from the browser's,
  // so rendering the time left on the server would never match what hydrates.
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setRemainingMs(new Date(deadline).getTime() - Date.now())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  if (remainingMs === null) return <p className="text-sm mt-2 font-semibold invisible" aria-hidden>{dict.payWithin}</p>
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
