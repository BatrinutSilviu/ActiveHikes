'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { WifiOff } from 'lucide-react'
import { useDict } from '@/hooks/useDict'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

// Shown while the browser reports no connection; when it comes back the current page's
// server data is refreshed, so whatever went stale while offline catches up.
export default function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  const router = useRouter()
  const dict = useDict()

  useEffect(() => {
    const refresh = () => router.refresh()
    window.addEventListener('online', refresh)
    return () => window.removeEventListener('online', refresh)
  }, [router])

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[1100] flex justify-center px-3 pointer-events-none"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-2 max-w-md bg-stone-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
        <WifiOff size={16} className="shrink-0 text-amber-300" />
        <span>{dict.network.offlineBanner}</span>
      </div>
    </div>
  )
}
