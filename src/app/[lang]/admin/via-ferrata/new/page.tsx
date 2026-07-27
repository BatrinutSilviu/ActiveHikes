'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createViaFerrata } from '@/app/actions/viaFerrata'
import { useDict, useLocale } from '@/hooks/useDict'

export default function NewViaFerrataPage() {
  const router = useRouter()
  const lang = useLocale()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const d = useDict().admin.viaFerrataNew

  const [form, setForm] = useState({
    title: '', location: '', description: '', date: '',
    price: '0', max_participants: '20', duration_hours: '', routes: '',
  })
  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    startTransition(async () => {
      try {
        const viaFerrataId = await createViaFerrata({
          title: form.title,
          location: form.location,
          description: form.description || undefined,
          date: form.date,
          price: parseFloat(form.price),
          maxParticipants: parseInt(form.max_participants),
          durationHours: form.duration_hours ? parseFloat(form.duration_hours) : undefined,
          routes: form.routes.split('\n').map(s => s.trim()).filter(Boolean),
        })
        router.push(`/${lang}/admin/via-ferrata/${viaFerrataId}`)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">{d.title}</h1>
      <p className="text-stone-500 mb-8">{d.subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title={d.basicInfo}>
          <Field label={d.eventTitle} required>
            <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder={d.titlePlaceholder} className={input} />
          </Field>
          <Field label={d.location} required>
            <input value={form.location} onChange={e => set('location', e.target.value)} required placeholder={d.locationPlaceholder} className={input} />
          </Field>
          <Field label={d.description}>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder={d.descriptionPlaceholder} className={input} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={d.date} required>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className={input} />
            </Field>
            <Field label={d.duration}>
              <input type="number" value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)} placeholder={d.durationPlaceholder} step="0.5" min="0" className={input} />
            </Field>
          </div>
        </Section>

        <Section title={d.participantsPayment}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={d.maxParticipants} required>
              <input type="number" value={form.max_participants} onChange={e => set('max_participants', e.target.value)} required min="1" className={input} />
            </Field>
            <Field label={d.price}>
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)} min="0" step="0.5" className={input} />
            </Field>
          </div>
        </Section>

        <Section title={d.routes}>
          <Field label={d.routesLabel}>
            <textarea value={form.routes} onChange={e => set('routes', e.target.value)} rows={5}
              placeholder={d.routesPlaceholder} className={input} />
            <p className="text-xs text-stone-400 mt-1.5">{d.routesHint}</p>
          </Field>
        </Section>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}

        <div className="flex gap-4">
          <button type="button" onClick={() => router.back()}
            className="flex-1 border border-stone-200 text-stone-700 py-3 rounded-xl font-semibold hover:bg-stone-50">
            {d.cancel}
          </button>
          <button type="submit" disabled={isPending}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60">
            {isPending ? d.creating : d.create}
          </button>
        </div>
      </form>
    </div>
  )
}

const input = "w-full border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-6 space-y-4">
      <h2 className="font-bold text-stone-800 text-lg border-b border-stone-100 pb-3">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
