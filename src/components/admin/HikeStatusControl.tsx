'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateHike } from '@/app/actions/hikes'
import { HikeStatus } from '@prisma/client'
import { EyeOff, Globe, CheckCircle2, XCircle, Send, Undo2, Loader2 } from 'lucide-react'

type Dict = {
  draft: string
  published: string
  publish: string
  revertToDraft: string
  draftHint: string
  publishedHint: string
  completedHint: string
  cancelledHint: string
  markAs: string
  normal: string
  completed: string
  cancelled: string
  error: string
}

export default function HikeStatusControl({
  hikeId,
  status,
  isPast,
  dict,
}: {
  hikeId: string
  status: HikeStatus
  // Past events are auto-completed, so "Normal" would just flip back on the next load
  isPast: boolean
  dict: Dict
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(status)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const setStatus = (next: HikeStatus) => {
    setError('')
    startTransition(async () => {
      try {
        await updateHike(hikeId, { status: next })
        setCurrent(next)
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : dict.error)
      }
    })
  }

  const isTerminal = current === 'completed' || current === 'cancelled'
  const isDraft = current === 'draft'

  // One card that says at a glance whether the event is out there, with the main action next to it.
  const look = current === 'completed'
    ? { Icon: CheckCircle2, title: dict.completed, hint: dict.completedHint, card: 'bg-stone-50 border-stone-200', tile: 'bg-stone-600', text: 'text-stone-800' }
    : current === 'cancelled'
      ? { Icon: XCircle, title: dict.cancelled, hint: dict.cancelledHint, card: 'bg-red-50 border-red-200', tile: 'bg-red-500', text: 'text-red-900' }
      : isDraft
        ? { Icon: EyeOff, title: dict.draft, hint: dict.draftHint, card: 'bg-amber-50 border-amber-200', tile: 'bg-amber-500', text: 'text-amber-900' }
        : { Icon: Globe, title: dict.published, hint: dict.publishedHint, card: 'bg-emerald-50 border-emerald-200', tile: 'bg-emerald-600', text: 'text-emerald-900' }

  return (
    <div className={`rounded-2xl border ${look.card} p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${look.tile}`}>
          <look.Icon size={20} strokeWidth={2.2} />
          {!isTerminal && !isDraft && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className={`font-bold leading-tight ${look.text}`}>{look.title}</p>
          <p className="text-sm text-stone-500 leading-snug">{look.hint}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {!isTerminal && (isDraft ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setStatus('upcoming')}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {dict.publish}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setStatus('draft')}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-800 disabled:opacity-60"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Undo2 size={15} />}
            {dict.revertToDraft}
          </button>
        ))}

        <label className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white pl-3 pr-1 py-1 text-xs text-stone-400">
          {dict.markAs}
          <select
            value={isTerminal ? current : ''}
            disabled={isPending}
            onChange={e => setStatus((e.target.value || 'upcoming') as HikeStatus)}
            className="rounded-lg bg-transparent py-1 pr-1 text-sm font-medium text-stone-700 focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            {!isPast && <option value="">{dict.normal}</option>}
            <option value="completed">{dict.completed}</option>
            <option value="cancelled">{dict.cancelled}</option>
          </select>
        </label>
      </div>

      {error && <p className="text-red-600 text-xs sm:basis-full">{error}</p>}
    </div>
  )
}
