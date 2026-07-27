'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateHike } from '@/app/actions/hikes'
import { HikeStatus } from '@prisma/client'

type Dict = {
  draft: string
  published: string
  publish: string
  revertToDraft: string
  markAs: string
  normal: string
  completed: string
  cancelled: string
  error: string
}

export default function HikeStatusControl({
  hikeId,
  status,
  dict,
}: {
  hikeId: string
  status: HikeStatus
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

  return (
    <div className="flex flex-wrap items-center gap-4">
      {!isTerminal && (
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isDraft ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isDraft ? dict.draft : dict.published}
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setStatus(isDraft ? 'upcoming' : 'draft')}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline disabled:opacity-50"
          >
            {isDraft ? dict.publish : dict.revertToDraft}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="text-xs text-stone-400">{dict.markAs}</label>
        <select
          value={isTerminal ? current : ''}
          disabled={isPending}
          onChange={e => setStatus((e.target.value || 'upcoming') as HikeStatus)}
          className="border border-stone-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          <option value="">{dict.normal}</option>
          <option value="completed">{dict.completed}</option>
          <option value="cancelled">{dict.cancelled}</option>
        </select>
      </div>

      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  )
}
