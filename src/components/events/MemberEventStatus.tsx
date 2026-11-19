'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Globe, Loader2, RotateCcw, XCircle } from 'lucide-react'
import { setMemberEventCancelled } from '@/app/actions/memberEvents'

type Dict = Record<
  'live' | 'liveHint' | 'cancelled' | 'cancelledHint' | 'over' | 'overHint' | 'cancelEvent' | 'cancelConfirm' | 'reopen' | 'statusError',
  string
>

/** Whether a member's event is live, cancelled or over, with cancelling (or taking it back) next to it. */
export default function MemberEventStatus({ eventId, cancelled, isPast, dict }: {
  eventId: string
  cancelled: boolean
  isPast: boolean
  dict: Dict
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const change = (cancel: boolean) => {
    if (cancel && !confirm(dict.cancelConfirm)) return
    setError('')
    startTransition(async () => {
      try {
        await setMemberEventCancelled(eventId, cancel)
        router.refresh()
      } catch {
        setError(dict.statusError)
      }
    })
  }

  const look = cancelled
    ? { Icon: XCircle, title: dict.cancelled, hint: dict.cancelledHint, card: 'bg-red-50 border-red-200', tile: 'bg-red-500', text: 'text-red-900' }
    : isPast
      ? { Icon: CheckCircle2, title: dict.over, hint: dict.overHint, card: 'bg-stone-50 border-stone-200', tile: 'bg-stone-600', text: 'text-stone-800' }
      : { Icon: Globe, title: dict.live, hint: dict.liveHint, card: 'bg-emerald-50 border-emerald-200', tile: 'bg-emerald-600', text: 'text-emerald-900' }

  return (
    <div className={`rounded-2xl border ${look.card} p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${look.tile}`}>
          <look.Icon size={20} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className={`font-bold leading-tight ${look.text}`}>{look.title}</p>
          <p className="text-sm text-stone-500 mt-0.5">{look.hint}</p>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
      </div>
      {!isPast && (
        <button onClick={() => change(!cancelled)} disabled={isPending}
          className={`shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors ${cancelled
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400'}`}>
          {isPending ? <Loader2 size={15} className="animate-spin" /> : cancelled ? <RotateCcw size={15} /> : <XCircle size={15} />}
          {cancelled ? dict.reopen : dict.cancelEvent}
        </button>
      )}
    </div>
  )
}
