'use client'

import { useState, useTransition } from 'react'
import { updateViaFerrata } from '@/app/actions/viaFerrata'
import { ViaFerrataStatus } from '@prisma/client'

type ViaFerrataData = {
  id: string
  title: string
  location: string
  description: string | null
  date: string
  price: number
  maxParticipants: number
  durationHours: number | null
  routes: string[]
  status: ViaFerrataStatus
}

type ViaFerrataEditDict = {
  title: string
  titlePlaceholder: string
  location: string
  locationPlaceholder: string
  description: string
  descriptionPlaceholder: string
  date: string
  duration: string
  durationPlaceholder: string
  status: string
  maxParticipants: string
  price: string
  routes: string
  routesPlaceholder: string
  routesHint: string
  savedSuccessfully: string
  saveChanges: string
  saving: string
  statuses: Record<string, string>
  ongoingIsAutomatic: string
}

export default function ViaFerrataEditForm({ viaFerrata, dict }: { viaFerrata: ViaFerrataData; dict: ViaFerrataEditDict }) {
  const [form, setForm] = useState({
    title: viaFerrata.title,
    location: viaFerrata.location,
    description: viaFerrata.description ?? '',
    date: viaFerrata.date.slice(0, 10),
    durationHours: viaFerrata.durationHours != null ? String(viaFerrata.durationHours) : '',
    status: viaFerrata.status,
    maxParticipants: String(viaFerrata.maxParticipants),
    price: String(viaFerrata.price),
    routes: viaFerrata.routes.join('\n'),
  })
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      await updateViaFerrata(viaFerrata.id, {
        title: form.title,
        location: form.location,
        description: form.description || null,
        date: form.date,
        durationHours: form.durationHours ? parseFloat(form.durationHours) : null,
        status: form.status as ViaFerrataStatus,
        maxParticipants: parseInt(form.maxParticipants),
        price: parseFloat(form.price),
        routes: form.routes.split('\n').map(s => s.trim()).filter(Boolean),
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  const cls = "w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"

  return (
    <form onSubmit={handleSave} className="bg-white border border-stone-100 rounded-2xl p-5 space-y-4">

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.title}</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder={dict.titlePlaceholder} className={cls} />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.location}</label>
        <input value={form.location} onChange={e => set('location', e.target.value)} required placeholder={dict.locationPlaceholder} className={cls} />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.description}</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder={dict.descriptionPlaceholder} className={cls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.date}</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.duration}</label>
          <input type="number" value={form.durationHours} onChange={e => set('durationHours', e.target.value)} min="0" step="0.5" placeholder={dict.durationPlaceholder} className={cls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.status}</label>
        <select value={form.status} onChange={e => set('status', e.target.value)} className={cls}>
          {(['upcoming', 'ongoing', 'completed', 'cancelled'] as const).map(s => (
            <option key={s} value={s} disabled={s === 'ongoing'}>{dict.statuses[s] ?? s}</option>
          ))}
        </select>
        <p className="text-xs text-stone-400 mt-1">{dict.ongoingIsAutomatic}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.maxParticipants}</label>
          <input type="number" value={form.maxParticipants} onChange={e => set('maxParticipants', e.target.value)} min="1" className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.price}</label>
          <input type="number" value={form.price} onChange={e => set('price', e.target.value)} min="0" step="0.5" className={cls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.routes}</label>
        <textarea value={form.routes} onChange={e => set('routes', e.target.value)}
          rows={5} placeholder={dict.routesPlaceholder} className={cls} />
        <p className="text-xs text-stone-400 mt-1.5">{dict.routesHint}</p>
      </div>

      {success && <p className="text-emerald-600 text-sm font-medium">{dict.savedSuccessfully}</p>}

      <button type="submit" disabled={isPending}
        className="w-full bg-stone-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-900 disabled:opacity-60">
        {isPending ? dict.saving : dict.saveChanges}
      </button>
    </form>
  )
}
