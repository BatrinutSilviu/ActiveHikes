'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignRoom } from '@/app/actions/hikes'

type Dict = {
  join: string
  joining: string
  leave: string
  leaving: string
  full: string
  joined: string
  error: string
}

export default function RoomJoinButton({
  hikeId,
  roomId,
  isCurrent,
  isFull,
  dict,
}: {
  hikeId: string
  roomId: string
  isCurrent: boolean
  isFull: boolean
  dict: Dict
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleClick = () => {
    setError('')
    startTransition(async () => {
      try {
        await assignRoom(hikeId, isCurrent ? null : roomId)
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : dict.error)
      }
    })
  }

  if (isCurrent) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          {dict.joined}
        </span>
        <button onClick={handleClick} disabled={isPending}
          className="text-xs text-stone-500 hover:text-red-600 underline disabled:opacity-50 transition-colors">
          {isPending ? dict.leaving : dict.leave}
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending || isFull}
        className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:bg-stone-300 transition-colors"
      >
        {isPending ? dict.joining : isFull ? dict.full : dict.join}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  )
}
