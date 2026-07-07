'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateHike } from '@/app/actions/hikes'

type Dict = {
  peoplePerCar: string
  carsNeeded: string
  save: string
  saving: string
  saved: string
}

export default function CarConfigForm({
  hikeId,
  peoplePerCar,
  carsNeeded,
  maxParticipants,
  dict,
}: {
  hikeId: string
  peoplePerCar: number
  carsNeeded: number | null
  maxParticipants: number
  dict: Dict
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    peoplePerCar: String(peoplePerCar),
    carsNeeded: carsNeeded != null ? String(carsNeeded) : '',
  })
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(false)
    startTransition(async () => {
      await updateHike(hikeId, {
        peoplePerCar: parseInt(form.peoplePerCar) || 5,
        carsNeeded: form.carsNeeded ? parseInt(form.carsNeeded) : null,
      })
      setSaved(true)
      router.refresh()
    })
  }

  const cls = "w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"

  return (
    <form onSubmit={handleSave} className="bg-white border border-stone-100 rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.peoplePerCar}</label>
          <input type="number" value={form.peoplePerCar} onChange={e => setForm(f => ({ ...f, peoplePerCar: e.target.value }))} min="1" className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.carsNeeded}</label>
          <input type="number" value={form.carsNeeded} onChange={e => setForm(f => ({ ...f, carsNeeded: e.target.value }))} min="0"
            placeholder={String(Math.ceil(maxParticipants / (parseInt(form.peoplePerCar) || 5)))} className={cls} />
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
