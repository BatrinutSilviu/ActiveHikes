'use client'

import { useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createHike } from '@/app/actions/hikes'
import { Upload, X } from 'lucide-react'
import { useDict, useLocale } from '@/hooks/useDict'

export default function NewHikePage() {
  const router = useRouter()
  const lang = useLocale()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const d = useDict().admin.newHike
  const timeLocale = lang === 'en' ? 'en-GB' : 'ro-RO'

  const computeCars = (participants: string, perCar: string) => {
    const p = parseInt(participants)
    const c = parseInt(perCar) || 5
    return (p > 0 && c > 0) ? String(Math.ceil(p / c)) : ''
  }

  const [form, setForm] = useState(() => {
    const max_participants = '20'
    const people_per_car = '5'
    return {
      title: '', destination: '', description: '', date: '', end_date: '', meeting_time: '',
      entry_fee: '0', max_participants, mountain_range: '', meeting_point: '', starting_point: '', duration_hours: '',
      people_per_car, cars_needed: computeCars(max_participants, people_per_car),
      has_camping: false, camping_details: '', camping_url: '', camping_price: '', has_accommodation: false, accommodation_details: '',
      accommodation_url: '', accommodation_price: '', accommodation_deposit: '', breakfast_time: '', dinner_time: '',
      check_in_time: '', check_out_time: '',
      double_room_count: '0', triple_room_count: '0', quadruple_room_count: '0',
      difficulty: '', external_photos_url: '', whatsapp_group_url: '', essentials: '',
    }
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [gpxApproxFile, setGpxApproxFile] = useState<File | null>(null)
  const set = (field: string, value: string | boolean) => setForm(f => {
    const next = { ...f, [field]: value }
    if (field === 'max_participants' || field === 'people_per_car') {
      next.cars_needed = computeCars(
        field === 'max_participants' ? value as string : f.max_participants,
        field === 'people_per_car' ? value as string : f.people_per_car,
      )
    }
    return next
  })

  const uploadFile = async (file: File, bucket: string) => {
    const fd = new FormData()
    fd.append('file', file); fd.append('bucket', bucket)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Upload failed')
    return (await res.json()).url as string
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    startTransition(async () => {
      try {
        let coverImageUrl: string | undefined
        let gpxApproximateUrl: string | undefined
        if (coverFile) coverImageUrl = await uploadFile(coverFile, 'hike-covers')
        if (gpxApproxFile) gpxApproximateUrl = await uploadFile(gpxApproxFile, 'hike-gpx')
        const hikeId = await createHike({
          title: form.title, destination: form.destination,
          description: form.description || undefined, date: form.date,
          endDate: form.end_date || undefined,
          meetingTime: form.meeting_time || undefined,
          entryFee: parseFloat(form.entry_fee), maxParticipants: parseInt(form.max_participants),
          mountainRange: form.mountain_range || undefined,
          meetingPoint: form.meeting_point || undefined,
          startingPoint: form.starting_point || undefined,
          durationHours: form.duration_hours ? parseFloat(form.duration_hours) : undefined,
          hasCamping: form.has_camping,
          campingDetails: form.camping_details || undefined,
          campingUrl: form.camping_url || undefined,
          campingPrice: form.camping_price ? parseFloat(form.camping_price) : undefined,
          hasAccommodation: form.has_accommodation,
          peoplePerCar: parseInt(form.people_per_car) || 5,
          carsNeeded: form.cars_needed ? parseInt(form.cars_needed) : undefined,
          accommodationDetails: form.accommodation_details || undefined,
          accommodationUrl: form.accommodation_url || undefined,
          accommodationPrice: form.accommodation_price ? parseFloat(form.accommodation_price) : undefined,
          accommodationDeposit: form.accommodation_deposit ? parseFloat(form.accommodation_deposit) : undefined,
          doubleRoomCount: form.double_room_count ? parseInt(form.double_room_count) : undefined,
          tripleRoomCount: form.triple_room_count ? parseInt(form.triple_room_count) : undefined,
          quadrupleRoomCount: form.quadruple_room_count ? parseInt(form.quadruple_room_count) : undefined,
          breakfastTime: form.breakfast_time || undefined,
          dinnerTime: form.dinner_time || undefined,
          checkInTime: form.check_in_time || undefined,
          checkOutTime: form.check_out_time || undefined,
          difficulty: form.difficulty || undefined, coverImageUrl, gpxApproximateUrl,
          essentials: form.essentials.split('\n').map(s => s.trim()).filter(Boolean),
          externalPhotosUrl: form.external_photos_url || undefined,
          whatsappGroupUrl: form.whatsapp_group_url || undefined,
        })
        router.push(`/${lang}/admin/hikes/${hikeId}`)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const diffs = d.difficulties as Record<string, string>

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">{d.title}</h1>
      <p className="text-stone-500 mb-8">{d.subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title={d.basicInfo}>
          <Field label={d.hikeTitle} required>
            <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder={d.titlePlaceholder} className={input} />
          </Field>
          <Field label={d.destination} required>
            <input value={form.destination} onChange={e => set('destination', e.target.value)} required placeholder={d.destinationPlaceholder} className={input} />
          </Field>
          <Field label={d.description}>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder={d.descriptionPlaceholder} className={input} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={d.date} required>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className={input} />
            </Field>
            <Field label={d.endDate}>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} min={form.date || undefined} className={input} />
            </Field>
            <Field label={d.meetingTime}>
              <input type="time" lang={timeLocale} value={form.meeting_time} onChange={e => set('meeting_time', e.target.value)} className={input} />
            </Field>
          </div>
          <Field label={d.difficulty}>
            <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} className={input}>
              <option value="">{d.selectDifficulty}</option>
              {(['easy','easy_medium','medium','medium_hard','hard'] as const).map(k => (
                <option key={k} value={k}>{diffs[k]}</option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title={d.participantsPayment}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={d.maxParticipants} required>
              <input type="number" value={form.max_participants} onChange={e => set('max_participants', e.target.value)} required min="1" className={input} />
            </Field>
            <Field label={d.entryFee}>
              <input type="number" value={form.entry_fee} onChange={e => set('entry_fee', e.target.value)} min="0" step="0.5" className={input} />
            </Field>
          </div>
        </Section>

        <Section title={d.logistics}>
          <Field label={d.mountainRange}>
            <input value={form.mountain_range} onChange={e => set('mountain_range', e.target.value)} placeholder={d.mountainRangePlaceholder} className={input} />
          </Field>
          <Field label={d.meetingPoint}>
            <input value={form.meeting_point} onChange={e => set('meeting_point', e.target.value)} placeholder={d.meetingPointPlaceholder} className={input} />
          </Field>
          <Field label={d.startingPoint}>
            <input value={form.starting_point} onChange={e => set('starting_point', e.target.value)} placeholder={d.startingPointPlaceholder} className={input} />
          </Field>
          <Field label={d.duration}>
            <input type="number" value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)} placeholder={d.durationPlaceholder} step="0.5" min="0" className={input} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={d.peoplePerCar}>
              <input type="number" value={form.people_per_car} onChange={e => set('people_per_car', e.target.value)} min="1" className={input} />
            </Field>
            <Field label={d.carsNeeded}>
              <input type="number" value={form.cars_needed} onChange={e => set('cars_needed', e.target.value)} min="0" className={input} />
            </Field>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.has_camping} onChange={e => set('has_camping', e.target.checked)} className="w-4 h-4 accent-emerald-600" />
              <span className="font-medium text-stone-700">{d.camping}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.has_accommodation} onChange={e => set('has_accommodation', e.target.checked)} className="w-4 h-4 accent-emerald-600" />
              <span className="font-medium text-stone-700">{d.accommodation}</span>
            </label>
          </div>
          {form.has_camping && (
            <>
              <Field label={d.campingDetails}>
                <textarea value={form.camping_details} onChange={e => set('camping_details', e.target.value)} rows={2} placeholder={d.campingDetailsPlaceholder} className={input} />
              </Field>
              <Field label={d.campingUrl}>
                <input type="url" value={form.camping_url} onChange={e => set('camping_url', e.target.value)} placeholder={d.campingUrlPlaceholder} className={input} />
              </Field>
              <Field label={d.campingPrice}>
                <input type="number" value={form.camping_price} onChange={e => set('camping_price', e.target.value)} min="0" step="1" placeholder="—" className={input} />
              </Field>
            </>
          )}
          {form.has_accommodation && (
            <>
              <Field label={d.accommodationDetails}>
                <textarea value={form.accommodation_details} onChange={e => set('accommodation_details', e.target.value)} rows={2} placeholder={d.accommodationPlaceholder} className={input} />
              </Field>
              <Field label={d.accommodationUrl}>
                <input type="url" value={form.accommodation_url} onChange={e => set('accommodation_url', e.target.value)} placeholder={d.accommodationUrlPlaceholder} className={input} />
              </Field>
            </>
          )}
          {form.has_accommodation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={d.accommodationPrice}>
                <input type="number" value={form.accommodation_price} onChange={e => set('accommodation_price', e.target.value)} min="0" step="1" placeholder={d.accommodationPricePlaceholder} className={input} />
              </Field>
              <Field label={d.accommodationDeposit}>
                <input type="number" value={form.accommodation_deposit} onChange={e => set('accommodation_deposit', e.target.value)} min="0" step="1" placeholder={d.accommodationDepositPlaceholder} className={input} />
              </Field>
            </div>
          )}
          {form.has_accommodation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={d.breakfastTime}>
                <input type="time" lang={timeLocale} value={form.breakfast_time} onChange={e => set('breakfast_time', e.target.value)} className={input} />
              </Field>
              <Field label={d.dinnerTime}>
                <input type="time" lang={timeLocale} value={form.dinner_time} onChange={e => set('dinner_time', e.target.value)} className={input} />
              </Field>
            </div>
          )}
          {form.has_accommodation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={d.checkInTime}>
                <input type="time" lang={timeLocale} value={form.check_in_time} onChange={e => set('check_in_time', e.target.value)} className={input} />
              </Field>
              <Field label={d.checkOutTime}>
                <input type="time" lang={timeLocale} value={form.check_out_time} onChange={e => set('check_out_time', e.target.value)} className={input} />
              </Field>
            </div>
          )}
          {form.has_accommodation && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={d.doubleRoomCount}>
                <input type="number" value={form.double_room_count} onChange={e => set('double_room_count', e.target.value)} min="0" step="1" className={input} />
              </Field>
              <Field label={d.tripleRoomCount}>
                <input type="number" value={form.triple_room_count} onChange={e => set('triple_room_count', e.target.value)} min="0" step="1" className={input} />
              </Field>
              <Field label={d.quadrupleRoomCount}>
                <input type="number" value={form.quadruple_room_count} onChange={e => set('quadruple_room_count', e.target.value)} min="0" step="1" className={input} />
              </Field>
            </div>
          )}
        </Section>

        <Section title={d.essentials}>
          <Field label={d.essentialsLabel}>
            <textarea value={form.essentials} onChange={e => set('essentials', e.target.value)} rows={5}
              placeholder={d.essentialsPlaceholder} className={input} />
            <p className="text-xs text-stone-400 mt-1.5">{d.essentialsHint}</p>
          </Field>
        </Section>

        <Section title={d.mediaRoutes}>
          <Field label={d.coverPhoto}>
            <FileInput accept="image/*" file={coverFile} onFile={setCoverFile} hint={d.coverPhotoHint} uploadLabel={d.clickToUpload} />
          </Field>
          <Field label={d.approximateGpx}>
            <FileInput accept=".gpx,.kml" file={gpxApproxFile} onFile={setGpxApproxFile} hint={d.approximateGpxHint} uploadLabel={d.clickToUpload} />
          </Field>
          <Field label={d.whatsappGroupUrl}>
            <input type="url" value={form.whatsapp_group_url} onChange={e => set('whatsapp_group_url', e.target.value)} placeholder={d.whatsappGroupUrlPlaceholder} className={input} />
          </Field>
          <Field label={d.externalAlbum}>
            <input type="url" value={form.external_photos_url} onChange={e => set('external_photos_url', e.target.value)} placeholder={d.externalAlbumPlaceholder} className={input} />
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
            {isPending ? d.creating : d.createHike}
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

function FileInput({ accept, file, onFile, hint, uploadLabel }: { accept: string; file: File | null; onFile: (f: File | null) => void; hint?: string; uploadLabel: string }) {
  return file ? (
    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
      <span className="text-emerald-700 font-medium text-sm flex-1 truncate">{file.name}</span>
      <button type="button" onClick={() => onFile(null)}><X size={16} className="text-stone-400" /></button>
    </div>
  ) : (
    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-stone-200 rounded-xl p-6 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
      <Upload size={20} className="text-stone-400" />
      <span className="text-stone-500 text-sm">{uploadLabel}</span>
      {hint && <span className="text-stone-400 text-xs text-center">{hint}</span>}
      <input type="file" accept={accept} className="hidden" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  )
}
