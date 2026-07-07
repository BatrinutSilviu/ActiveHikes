'use client'

import { useState, useTransition } from 'react'
import { updateHike } from '@/app/actions/hikes'
import { Upload, X } from 'lucide-react'
import { HikeStatus } from '@prisma/client'

type HikeData = {
  id: string
  title: string
  destination: string
  description: string | null
  date: string
  endDate: string | null
  meetingTime: string | null
  durationHours: number | null
  difficulty: string | null
  status: HikeStatus
  coverImageUrl: string | null
  externalPhotosUrl: string | null
  whatsappGroupUrl: string | null
  accommodationDetails: string | null
  accommodationUrl: string | null
  accommodationPrice: number | null
  accommodationDeposit: number | null
  doubleRoomCount: number
  tripleRoomCount: number
  quadrupleRoomCount: number
  breakfastTime: string | null
  dinnerTime: string | null
  checkInTime: string | null
  checkOutTime: string | null
  entryFee: number
  maxParticipants: number
  gpxActualUrl: string | null
  gpxApproximateUrl: string | null
  mountainRange: string | null
  meetingPoint: string | null
  startingPoint: string | null
  hasCamping: boolean
  campingDetails: string | null
  campingUrl: string | null
  campingPrice: number | null
  hasAccommodation: boolean
  peoplePerCar: number
  carsNeeded: number | null
  essentials: string[]
}

type HikeEditDict = {
  title: string
  titlePlaceholder: string
  destination: string
  destinationPlaceholder: string
  description: string
  descriptionPlaceholder: string
  date: string
  endDate: string
  meetingTime: string
  duration: string
  durationPlaceholder: string
  difficulty: string
  selectDifficulty: string
  status: string
  maxParticipants: string
  entryFee: string
  mountainRange: string
  mountainRangePlaceholder: string
  meetingPoint: string
  meetingPointPlaceholder: string
  startingPoint: string
  startingPointPlaceholder: string
  peoplePerCar: string
  carsNeeded: string
  camping: string
  campingDetails: string
  campingDetailsPlaceholder: string
  campingUrl: string
  campingUrlPlaceholder: string
  campingPrice: string
  accommodation: string
  accommodationDetails: string
  accommodationDetailsPlaceholder: string
  accommodationUrl: string
  accommodationUrlPlaceholder: string
  accommodationPrice: string
  accommodationDeposit: string
  doubleRoomCount: string
  tripleRoomCount: string
  quadrupleRoomCount: string
  breakfastTime: string
  dinnerTime: string
  checkInTime: string
  checkOutTime: string
  essentials: string
  essentialsPlaceholder: string
  essentialsHint: string
  coverPhoto: string
  coverPhotoSet: string
  changeCoverPhoto: string
  whatsappGroupUrl: string
  whatsappGroupUrlPlaceholder: string
  externalPhotoAlbum: string
  uploadApproximateGpx: string
  gpxApproximateUploaded: string
  uploadActualGpx: string
  gpxUploaded: string
  uploadPostHikeGpx: string
  savedSuccessfully: string
  saveChanges: string
  saving: string
  statuses: Record<string, string>
  difficulties: Record<string, string>
}

const DIFFICULTIES = ['easy', 'easy_medium', 'medium', 'medium_hard', 'hard'] as const

export default function HikeEditForm({ hike, dict }: { hike: HikeData; dict: HikeEditDict }) {
  const [form, setForm] = useState({
    title: hike.title,
    destination: hike.destination,
    description: hike.description ?? '',
    date: hike.date.slice(0, 10),
    endDate: hike.endDate ? hike.endDate.slice(0, 10) : '',
    meetingTime: hike.meetingTime ?? '',
    durationHours: hike.durationHours != null ? String(hike.durationHours) : '',
    difficulty: hike.difficulty ?? '',
    status: hike.status,
    externalPhotosUrl: hike.externalPhotosUrl ?? '',
    whatsappGroupUrl: hike.whatsappGroupUrl ?? '',
    accommodationDetails: hike.accommodationDetails ?? '',
    accommodationUrl: hike.accommodationUrl ?? '',
    accommodationPrice: hike.accommodationPrice != null ? String(hike.accommodationPrice) : '',
    accommodationDeposit: hike.accommodationDeposit != null ? String(hike.accommodationDeposit) : '',
    doubleRoomCount: String(hike.doubleRoomCount),
    tripleRoomCount: String(hike.tripleRoomCount),
    quadrupleRoomCount: String(hike.quadrupleRoomCount),
    breakfastTime: hike.breakfastTime ?? '',
    dinnerTime: hike.dinnerTime ?? '',
    checkInTime: hike.checkInTime ?? '',
    checkOutTime: hike.checkOutTime ?? '',
    entryFee: String(hike.entryFee),
    maxParticipants: String(hike.maxParticipants),
    mountainRange: hike.mountainRange ?? '',
    meetingPoint: hike.meetingPoint ?? '',
    startingPoint: hike.startingPoint ?? '',
    hasCamping: hike.hasCamping,
    campingDetails: hike.campingDetails ?? '',
    campingUrl: hike.campingUrl ?? '',
    campingPrice: hike.campingPrice != null ? String(hike.campingPrice) : '',
    hasAccommodation: hike.hasAccommodation,
    peoplePerCar: String(hike.peoplePerCar),
    carsNeeded: hike.carsNeeded != null ? String(hike.carsNeeded) : '',
    essentials: hike.essentials.join('\n'),
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [gpxApproxFile, setGpxApproxFile] = useState<File | null>(null)
  const [gpxActualFile, setGpxActualFile] = useState<File | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const set = (field: string, value: string | boolean) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      let gpxActualUrl = hike.gpxActualUrl
      let gpxApproximateUrl = hike.gpxApproximateUrl
      let coverImageUrl = hike.coverImageUrl

      if (coverFile) {
        const fd = new FormData()
        fd.append('file', coverFile)
        fd.append('bucket', 'hike-covers')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        coverImageUrl = (await res.json()).url
      }

      if (gpxApproxFile) {
        const fd = new FormData()
        fd.append('file', gpxApproxFile)
        fd.append('bucket', 'hike-gpx')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        gpxApproximateUrl = (await res.json()).url
      }

      if (gpxActualFile) {
        const fd = new FormData()
        fd.append('file', gpxActualFile)
        fd.append('bucket', 'hike-gpx')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        gpxActualUrl = (await res.json()).url
      }

      await updateHike(hike.id, {
        title: form.title,
        destination: form.destination,
        description: form.description || null,
        date: form.date,
        endDate: form.endDate || null,
        meetingTime: form.meetingTime || null,
        durationHours: form.durationHours ? parseFloat(form.durationHours) : null,
        difficulty: form.difficulty || null,
        status: form.status as HikeStatus,
        externalPhotosUrl: form.externalPhotosUrl || null,
        whatsappGroupUrl: form.whatsappGroupUrl || null,
        accommodationDetails: form.accommodationDetails || null,
        accommodationUrl: form.accommodationUrl || null,
        accommodationPrice: form.accommodationPrice ? parseFloat(form.accommodationPrice) : null,
        accommodationDeposit: form.accommodationDeposit ? parseFloat(form.accommodationDeposit) : null,
        doubleRoomCount: parseInt(form.doubleRoomCount) || 0,
        tripleRoomCount: parseInt(form.tripleRoomCount) || 0,
        quadrupleRoomCount: parseInt(form.quadrupleRoomCount) || 0,
        breakfastTime: form.breakfastTime || null,
        dinnerTime: form.dinnerTime || null,
        checkInTime: form.checkInTime || null,
        checkOutTime: form.checkOutTime || null,
        entryFee: parseFloat(form.entryFee),
        maxParticipants: parseInt(form.maxParticipants),
        mountainRange: form.mountainRange || null,
        meetingPoint: form.meetingPoint || null,
        startingPoint: form.startingPoint || null,
        hasCamping: form.hasCamping,
        campingDetails: form.campingDetails || null,
        campingUrl: form.campingUrl || null,
        campingPrice: form.campingPrice ? parseFloat(form.campingPrice) : null,
        hasAccommodation: form.hasAccommodation,
        peoplePerCar: parseInt(form.peoplePerCar) || 5,
        carsNeeded: form.carsNeeded ? parseInt(form.carsNeeded) : null,
        essentials: form.essentials.split('\n').map(s => s.trim()).filter(Boolean),
        gpxActualUrl,
        gpxApproximateUrl,
        coverImageUrl,
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  const cls = "w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"

  return (
    <form onSubmit={handleSave} className="bg-white border border-stone-100 rounded-2xl p-5 space-y-4">

      {/* Basic info */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.title}</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder={dict.titlePlaceholder} className={cls} />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.destination}</label>
        <input value={form.destination} onChange={e => set('destination', e.target.value)} required placeholder={dict.destinationPlaceholder} className={cls} />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.description}</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder={dict.descriptionPlaceholder} className={cls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.date}</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.endDate}</label>
          <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} min={form.date || undefined} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.meetingTime}</label>
          <input value={form.meetingTime} onChange={e => set('meetingTime', e.target.value)} placeholder="08:00" className={cls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.duration}</label>
          <input type="number" value={form.durationHours} onChange={e => set('durationHours', e.target.value)} min="0" step="0.5" placeholder={dict.durationPlaceholder} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.difficulty}</label>
          <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} className={cls}>
            <option value="">{dict.selectDifficulty}</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{dict.difficulties[d] ?? d}</option>)}
          </select>
        </div>
      </div>

      {/* Status & participants */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.status}</label>
        <select value={form.status} onChange={e => set('status', e.target.value)} className={cls}>
          {(['upcoming', 'ongoing', 'completed', 'cancelled'] as const).map(s => (
            <option key={s} value={s}>{dict.statuses[s] ?? s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.maxParticipants}</label>
          <input type="number" value={form.maxParticipants} onChange={e => set('maxParticipants', e.target.value)} min="1" className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.entryFee}</label>
          <input type="number" value={form.entryFee} onChange={e => set('entryFee', e.target.value)} min="0" step="0.5" className={cls} />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.mountainRange}</label>
        <input value={form.mountainRange} onChange={e => set('mountainRange', e.target.value)} placeholder={dict.mountainRangePlaceholder} className={cls} />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.meetingPoint}</label>
        <input value={form.meetingPoint} onChange={e => set('meetingPoint', e.target.value)} placeholder={dict.meetingPointPlaceholder} className={cls} />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.startingPoint}</label>
        <input value={form.startingPoint} onChange={e => set('startingPoint', e.target.value)} placeholder={dict.startingPointPlaceholder} className={cls} />
      </div>

      {/* Cars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.peoplePerCar}</label>
          <input type="number" value={form.peoplePerCar} onChange={e => set('peoplePerCar', e.target.value)} min="1" className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.carsNeeded}</label>
          <input type="number" value={form.carsNeeded} onChange={e => set('carsNeeded', e.target.value)} min="0"
            placeholder={String(Math.ceil(parseInt(form.maxParticipants) / (parseInt(form.peoplePerCar) || 5)))} className={cls} />
        </div>
      </div>

      {/* Camping / accommodation checkboxes */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.hasCamping} onChange={e => set('hasCamping', e.target.checked)} className="w-4 h-4 accent-emerald-600" />
          <span className="text-sm font-medium text-stone-700">{dict.camping}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.hasAccommodation} onChange={e => set('hasAccommodation', e.target.checked)} className="w-4 h-4 accent-emerald-600" />
          <span className="text-sm font-medium text-stone-700">{dict.accommodation}</span>
        </label>
      </div>

      {form.hasCamping && (
        <>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{dict.campingDetails}</label>
            <textarea value={form.campingDetails} onChange={e => set('campingDetails', e.target.value)}
              rows={2} placeholder={dict.campingDetailsPlaceholder} className={cls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{dict.campingUrl}</label>
            <input type="url" value={form.campingUrl} onChange={e => set('campingUrl', e.target.value)}
              placeholder={dict.campingUrlPlaceholder} className={cls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{dict.campingPrice}</label>
            <input type="number" value={form.campingPrice} onChange={e => set('campingPrice', e.target.value)}
              min="0" step="1" placeholder="—" className={cls} />
          </div>
        </>
      )}

      {form.hasAccommodation && (
        <>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{dict.accommodationDetails}</label>
            <textarea value={form.accommodationDetails} onChange={e => set('accommodationDetails', e.target.value)}
              rows={2} placeholder={dict.accommodationDetailsPlaceholder} className={cls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{dict.accommodationUrl}</label>
            <input type="url" value={form.accommodationUrl} onChange={e => set('accommodationUrl', e.target.value)}
              placeholder={dict.accommodationUrlPlaceholder} className={cls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{dict.accommodationPrice}</label>
              <input type="number" value={form.accommodationPrice} onChange={e => set('accommodationPrice', e.target.value)} min="0" step="1" placeholder="—" className={cls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{dict.accommodationDeposit}</label>
              <input type="number" value={form.accommodationDeposit} onChange={e => set('accommodationDeposit', e.target.value)} min="0" step="1" placeholder="—" className={cls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{dict.breakfastTime}</label>
              <input type="time" value={form.breakfastTime} onChange={e => set('breakfastTime', e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{dict.dinnerTime}</label>
              <input type="time" value={form.dinnerTime} onChange={e => set('dinnerTime', e.target.value)} className={cls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{dict.checkInTime}</label>
              <input type="time" value={form.checkInTime} onChange={e => set('checkInTime', e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{dict.checkOutTime}</label>
              <input type="time" value={form.checkOutTime} onChange={e => set('checkOutTime', e.target.value)} className={cls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{dict.doubleRoomCount}</label>
              <input type="number" value={form.doubleRoomCount} onChange={e => set('doubleRoomCount', e.target.value)} min="0" step="1" className={cls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{dict.tripleRoomCount}</label>
              <input type="number" value={form.tripleRoomCount} onChange={e => set('tripleRoomCount', e.target.value)} min="0" step="1" className={cls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{dict.quadrupleRoomCount}</label>
              <input type="number" value={form.quadrupleRoomCount} onChange={e => set('quadrupleRoomCount', e.target.value)} min="0" step="1" className={cls} />
            </div>
          </div>
        </>
      )}

      {/* Essentials */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.essentials}</label>
        <textarea value={form.essentials} onChange={e => set('essentials', e.target.value)}
          rows={5} placeholder={dict.essentialsPlaceholder} className={cls} />
        <p className="text-xs text-stone-400 mt-1.5">{dict.essentialsHint}</p>
      </div>

      {/* Cover photo */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.coverPhoto}</label>
        {coverFile ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <span className="text-emerald-700 text-sm flex-1 truncate">{coverFile.name}</span>
            <button type="button" onClick={() => setCoverFile(null)}><X size={14} className="text-stone-400" /></button>
          </div>
        ) : (
          <label className="flex items-center gap-2 border border-dashed border-stone-200 rounded-xl px-4 py-3 cursor-pointer hover:border-emerald-300 transition-colors">
            <Upload size={16} className="text-stone-400" />
            <span className="text-stone-500 text-sm">{dict.changeCoverPhoto}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && setCoverFile(e.target.files[0])} />
          </label>
        )}
        {hike.coverImageUrl && !coverFile && (
          <div className="mt-1.5 flex items-center gap-2">
            <img src={hike.coverImageUrl} alt="" className="w-12 h-8 object-cover rounded" />
            <p className="text-xs text-emerald-600">{dict.coverPhotoSet}</p>
          </div>
        )}
      </div>

      {/* WhatsApp group */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.whatsappGroupUrl}</label>
        <input type="url" value={form.whatsappGroupUrl} onChange={e => set('whatsappGroupUrl', e.target.value)}
          placeholder={dict.whatsappGroupUrlPlaceholder} className={cls} />
      </div>

      {/* External album */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.externalPhotoAlbum}</label>
        <input type="url" value={form.externalPhotosUrl} onChange={e => set('externalPhotosUrl', e.target.value)}
          placeholder="https://photos.google.com/…" className={cls} />
      </div>

      {/* Approximate GPX */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.uploadApproximateGpx}</label>
        {gpxApproxFile ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <span className="text-emerald-700 text-sm flex-1 truncate">{gpxApproxFile.name}</span>
            <button type="button" onClick={() => setGpxApproxFile(null)}><X size={14} className="text-stone-400" /></button>
          </div>
        ) : (
          <label className="flex items-center gap-2 border border-dashed border-stone-200 rounded-xl px-4 py-3 cursor-pointer hover:border-emerald-300 transition-colors">
            <Upload size={16} className="text-stone-400" />
            <span className="text-stone-500 text-sm">{dict.uploadApproximateGpx}</span>
            <input type="file" accept=".gpx,.kml" className="hidden" onChange={e => e.target.files?.[0] && setGpxApproxFile(e.target.files[0])} />
          </label>
        )}
        {hike.gpxApproximateUrl && !gpxApproxFile && <p className="text-xs text-emerald-600 mt-1">{dict.gpxApproximateUploaded}</p>}
      </div>

      {/* Actual GPX (post-hike) */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.uploadActualGpx}</label>
        {gpxActualFile ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <span className="text-emerald-700 text-sm flex-1 truncate">{gpxActualFile.name}</span>
            <button type="button" onClick={() => setGpxActualFile(null)}><X size={14} className="text-stone-400" /></button>
          </div>
        ) : (
          <label className="flex items-center gap-2 border border-dashed border-stone-200 rounded-xl px-4 py-3 cursor-pointer hover:border-emerald-300 transition-colors">
            <Upload size={16} className="text-stone-400" />
            <span className="text-stone-500 text-sm">{dict.uploadPostHikeGpx}</span>
            <input type="file" accept=".gpx,.kml" className="hidden" onChange={e => e.target.files?.[0] && setGpxActualFile(e.target.files[0])} />
          </label>
        )}
        {hike.gpxActualUrl && !gpxActualFile && <p className="text-xs text-emerald-600 mt-1">{dict.gpxUploaded}</p>}
      </div>

      {success && <p className="text-emerald-600 text-sm font-medium">{dict.savedSuccessfully}</p>}

      <button type="submit" disabled={isPending}
        className="w-full bg-stone-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-900 disabled:opacity-60">
        {isPending ? dict.saving : dict.saveChanges}
      </button>
    </form>
  )
}
