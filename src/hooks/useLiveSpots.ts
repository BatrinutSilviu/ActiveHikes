'use client'

import { useEffect, useState } from 'react'
import { apiFetch, POLL_REQUEST } from '@/lib/net'

const POLL_INTERVAL_MS = 5000

/**
 * Keeps an event's spot counts fresh while its page is open: starts from the
 * server-rendered numbers and then polls the event's /spots endpoint.
 */
export function useLiveSpots<T>(spotsUrl: string, initial: T): T {
  const [spots, setSpots] = useState(initial)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(spotsUrl, { ...POLL_REQUEST })
        if (res.ok) setSpots(await res.json())
      } catch {
        // A failed poll keeps the last numbers on screen; the next poll retries.
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [spotsUrl])

  return spots
}
