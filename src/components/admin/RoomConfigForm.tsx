'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateHike } from '@/app/actions/hikes'

type Dict = {
  doubleRoomCount: string
  tripleRoomCount: string
  quadrupleRoomCount: string
  save: string
  saving: string
  saved: string
}

export default function RoomConfigForm({
  hikeId,
  doubleRoomCount,
  tripleRoomCount,
  quadrupleRoomCount,
  dict,
}: {
  hikeId: string
  doubleRoomCount: number
  tripleRoomCount: number
  quadrupleRoomCount: number
  dict: Dict
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    doubleRoomCount: String(doubleRoomCount),
    tripleRoomCount: String(tripleRoomCount),
    quadrupleRoomCount: String(quadrupleRoomCount),
  })
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(false)
    startTransition(async () => {
      await updateHike(hikeId, {
        doubleRoomCount: parseInt(form.doubleRoomCount) || 0,
        tripleRoomCount: parseInt(form.tripleRoomCount) || 0,
        quadrupleRoomCount: parseInt(form.quadrupleRoomCount) || 0,
      })
      setSaved(true)
      router.refresh()
    })
  }

  const cls = "w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"

  return (
    <form onSubmit={handleSave} className="bg-white border border-stone-100 rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.doubleRoomCount}</label>
          <input type="number" value={form.doubleRoomCount} onChange={e => setForm(f => ({ ...f, doubleRoomCount: e.target.value }))} min="0" step="1" className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.tripleRoomCount}</label>
          <input type="number" value={form.tripleRoomCount} onChange={e => setForm(f => ({ ...f, tripleRoomCount: e.target.value }))} min="0" step="1" className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.quadrupleRoomCount}</label>
          <input type="number" value={form.quadrupleRoomCount} onChange={e => setForm(f => ({ ...f, quadrupleRoomCount: e.target.value }))} min="0" step="1" className={cls} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending}
          className="bg-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
          {isPending ? dict.saving : dict.save}
        </button>
        {saved && !isPending && <span className="text-emerald-600 text-sm font-medium">{dict.saved}</span>}
      </div>
    </form>
  )
}
