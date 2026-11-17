'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { HikeType } from '@prisma/client'
import { Upload, X } from 'lucide-react'
import { createHike } from '@/app/actions/hikes'
import { useDict, useLocale } from '@/hooks/useDict'
import { uploadFile } from '@/lib/upload'
import PaymentMethodsDropdown, { type PaymentMethodOption } from '@/components/admin/PaymentMethodsDropdown'
import { EVENT_PATH } from '@/lib/eventPaths'
import { isSportCategory } from '@/lib/sportCategories'
import EventTypePicker from '@/components/events/EventTypePicker'

// Creating any event. The basic info is the same for every kind; picking Hike or Via Ferrata as the
// type adds their own sections (logistics, accommodation, routes…). Every kind is saved in the Hike
// table: a general event keeps its kind in `category`, a via ferrata its total price and advance in
// accommodationPrice / accommodationDeposit.

// Type picker values that aren't hike / via_ferrata: a general event's kind, or one typed in by hand.
const CATEGORY = 'category:'
const NEW_CATEGORY = 'new-category'

const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

export default function NewEventForm({ categories, fromManagement, paymentMethods, initialType, categoryCovers = {} }: {
  /** The management app's event types, or, when it can't be reached, the kinds used here before. */
  categories: string[]
  fromManagement: boolean
  paymentMethods: PaymentMethodOption[]
  initialType?: string
  /** Default cover photo per kind of general event (by name in lower case), used when none is chosen. */
  categoryCovers?: Record<string, string>
}) {
  const router = useRouter()
  const lang = useLocale()
  const dict = useDict()
  const d = dict.admin.newHike
  const dv = dict.admin.viaFerrataEdit
  const de = dict.events.admin.form
  const types = dict.events.types
  const dp = dict.admin.eventPhotos
  const timeLocale = lang === 'en' ? 'en-GB' : 'ro-RO'
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [typeChoice, setTypeChoice] = useState(() =>
    initialType === 'hike' || initialType === 'via_ferrata' ? initialType : '')
  const kind: HikeType | null = typeChoice === 'hike' || typeChoice === 'via_ferrata' ? typeChoice
    : typeChoice ? 'event' : null
  const isHike = kind === 'hike'
  const isViaFerrata = kind === 'via_ferrata'
  const isEvent = kind === 'event'

  const [bankAccountIds, setBankAccountIds] = useState<string[]>(() => paymentMethods.map(a => a.id))

  const computeCars = (participants: string, perCar: string) => {
    const p = parseInt(participants)
    const c = parseInt(perCar) || 5
    return (p > 0 && c > 0) ? String(Math.ceil(p / c)) : ''
  }
  const [form, setForm] = useState({
    category: '',
    title: '', destination: '', meeting_point: '', description: '', date: '', end_date: '', meeting_time: '', end_time: '',
    max_participants: '20', entry_fee: '0', advance_fee: '', group_count: '',
    mountain_range: '', starting_point: '', duration_hours: '', people_per_car: '5', cars_needed: computeCars('20', '5'),
    has_camping: false, camping_details: '', camping_url: '', camping_price: '', has_accommodation: false, accommodation_details: '',
    accommodation_url: '', accommodation_price: '', accommodation_deposit: '', breakfast_time: '', dinner_time: '',
    check_in_time: '', check_out_time: '', double_room_count: '0', triple_room_count: '0', quadruple_room_count: '0',
    difficulty: '', external_photos_url: '', whatsapp_group_url: '', essentials: '',
  })
  // Sports sessions (football, running…) have no address, "what to bring" list or WhatsApp group.
  const isSport = isEvent && isSportCategory(form.category)
  const defaultCover = isEvent ? categoryCovers[form.category.trim().toLowerCase()] : undefined
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverFile2, setCoverFile2] = useState<File | null>(null)
  const [gpxApproxFile, setGpxApproxFile] = useState<File | null>(null)
  const set = (field: keyof typeof form, value: string | boolean) => setForm(f => {
    const next = { ...f, [field]: value }
    if (field === 'max_participants' || field === 'people_per_car') {
      next.cars_needed = computeCars(next.max_participants, next.people_per_car)
    }
    return next
  })

  const pickType = (value: string) => {
    setTypeChoice(value)
    if (value.startsWith(CATEGORY)) set('category', value.slice(CATEGORY.length))
    else if (value === NEW_CATEGORY) set('category', '')
  }

  const num = (v: string) => v === '' ? undefined : parseFloat(v)
  const int = (v: string) => v === '' ? undefined : parseInt(v)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!kind) return
    if (form.end_date && form.date && form.end_date < form.date) { setError(de.endBeforeStart); return }
    if (isEvent) {
      const advance = num(form.advance_fee)
      if (advance != null && advance > (num(form.entry_fee) ?? 0)) { setError(de.advanceTooHigh); return }
      if (!form.end_date && form.meeting_time && form.end_time && toMinutes(form.end_time) <= toMinutes(form.meeting_time)) {
        setError(de.endBeforeStart); return
      }
    }

    startTransition(async () => {
      try {
        const coverImageUrl = coverFile ? await uploadFile(coverFile, 'hike-covers') : undefined
        const coverImageUrl2 = coverFile2 && !isEvent ? await uploadFile(coverFile2, 'hike-covers') : undefined
        const gpxApproximateUrl = gpxApproxFile && isHike ? await uploadFile(gpxApproxFile, 'hike-gpx') : undefined
        // A general event's length comes from its start and end times.
        const eventDuration = isEvent && form.meeting_time && form.end_time && !form.end_date
          ? Math.round((toMinutes(form.end_time) - toMinutes(form.meeting_time)) / 6) / 10 : undefined

        const id = await createHike({
          type: kind,
          bankAccountIds,
          title: form.title.trim(),
          destination: form.destination.trim(),
          meetingPoint: isSport ? undefined : form.meeting_point.trim() || undefined,
          description: form.description.trim() || undefined,
          date: form.date,
          endDate: !isViaFerrata ? form.end_date || undefined : undefined,
          meetingTime: form.meeting_time || undefined,
          maxParticipants: parseInt(form.max_participants) || 1,
          entryFee: isViaFerrata ? 0 : num(form.entry_fee) ?? 0,
          essentials: isSport ? [] : form.essentials.split('\n').map(s => s.trim()).filter(Boolean),
          whatsappGroupUrl: isSport ? undefined : form.whatsapp_group_url.trim() || undefined,
          coverImageUrl, coverImageUrl2, gpxApproximateUrl,
          hasCamping: isHike && form.has_camping,
          hasAccommodation: isHike && form.has_accommodation,
          ...(isEvent ? {
            category: form.category.trim(),
            endTime: form.end_time || undefined,
            advanceFee: num(form.advance_fee),
            durationHours: eventDuration && eventDuration > 0 ? eventDuration : undefined,
          } : {
            startingPoint: form.starting_point || undefined,
            durationHours: num(form.duration_hours),
            peoplePerCar: parseInt(form.people_per_car) || 5,
            carsNeeded: int(form.cars_needed),
            // A via ferrata keeps its total price and advance in the accommodation price fields.
            accommodationPrice: num(form.accommodation_price),
            accommodationDeposit: num(form.accommodation_deposit),
          }),
          ...(isViaFerrata ? { groupCount: int(form.group_count) } : {}),
          ...(isHike ? {
            difficulty: form.difficulty || undefined,
            mountainRange: form.mountain_range || undefined,
            campingDetails: form.camping_details || undefined,
            campingUrl: form.camping_url || undefined,
            campingPrice: num(form.camping_price),
            accommodationDetails: form.accommodation_details || undefined,
            accommodationUrl: form.accommodation_url || undefined,
            doubleRoomCount: int(form.double_room_count),
            tripleRoomCount: int(form.triple_room_count),
            quadrupleRoomCount: int(form.quadruple_room_count),
            breakfastTime: form.breakfast_time || undefined,
            dinnerTime: form.dinner_time || undefined,
            checkInTime: form.check_in_time || undefined,
            checkOutTime: form.check_out_time || undefined,
            externalPhotosUrl: form.external_photos_url || undefined,
          } : {}),
        })
        router.push(`/${lang}/admin/${EVENT_PATH[kind]}/${id}`)
      } catch (err) {
        setError(`${de.saveError}${err instanceof Error && err.message ? ` (${err.message})` : ''}`)
      }
    })
  }

  const diffs = d.difficulties as Record<string, string>
  const otherCategory = form.category && !categories.includes(form.category) ? [form.category] : []

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section title={d.basicInfo}>
        <Field label={de.category} required>
          <EventTypePicker
            value={typeChoice.startsWith(CATEGORY) ? `${CATEGORY}${form.category}` : typeChoice}
            onChange={pickType}
            placeholder={de.categoryPick}
            main={[
              { value: 'hike', label: types.hike, icon: 'hike' },
              { value: 'via_ferrata', label: types.via_ferrata, icon: 'via_ferrata' },
            ]}
            others={[...categories, ...otherCategory].map(c => ({ value: `${CATEGORY}${c}`, label: c }))}
            newOption={fromManagement ? undefined : { value: NEW_CATEGORY, label: de.categoryOther }}
          />
          {typeChoice === NEW_CATEGORY && (
            <input value={form.category} onChange={e => set('category', e.target.value)} required
              placeholder={de.categoryPlaceholder} className={`${input} mt-2`} />
          )}
          {isEvent && <p className="text-xs text-stone-400 mt-1.5">{de.categoryHint}</p>}
        </Field>

        {kind && (
          <>
            <Field label={isHike ? d.hikeTitle : isViaFerrata ? dv.title : de.title} required>
              <input value={form.title} onChange={e => set('title', e.target.value)} required
                placeholder={isEvent ? de.titlePlaceholder : d.titlePlaceholder} className={input} />
            </Field>
            <div className={`grid grid-cols-1 gap-4 ${isSport ? '' : 'sm:grid-cols-2'}`}>
              <Field label={isEvent ? de.place : d.destination} required>
                <input value={form.destination} onChange={e => set('destination', e.target.value)} required
                  placeholder={isEvent ? de.placePlaceholder : d.destinationPlaceholder} className={input} />
              </Field>
              {!isSport && (
                <Field label={isEvent ? de.address : d.meetingPoint}>
                  <input value={form.meeting_point} onChange={e => set('meeting_point', e.target.value)}
                    placeholder={isEvent ? de.addressPlaceholder : d.meetingPointPlaceholder} className={input} />
                </Field>
              )}
            </div>
            <Field label={d.description}>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
                placeholder={isEvent ? de.descriptionPlaceholder : d.descriptionPlaceholder} className={input} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={d.date} required>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required min="2020-01-01" max="2099-12-31" className={input} />
              </Field>
              {!isViaFerrata && (
                <Field label={isEvent ? de.endDate : d.endDate}>
                  <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} min={form.date || undefined} max="2099-12-31" className={input} />
                </Field>
              )}
              <Field label={isEvent ? de.startTime : d.meetingTime}>
                <input type="time" lang={timeLocale} value={form.meeting_time} onChange={e => set('meeting_time', e.target.value)} className={input} />
              </Field>
              {isEvent && (
                <Field label={de.endTime}>
                  <input type="time" lang={timeLocale} value={form.end_time} onChange={e => set('end_time', e.target.value)} className={input} />
                </Field>
              )}
            </div>
          </>
        )}
      </Section>

      {kind && (
        <>
          <Section title={d.participantsPayment}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={d.maxParticipants} required>
                <input type="number" value={form.max_participants} onChange={e => set('max_participants', e.target.value)} required min="1" className={input} />
              </Field>
              {isViaFerrata ? (
                <>
                  <Field label={dv.totalPrice}>
                    <input type="number" value={form.accommodation_price} onChange={e => set('accommodation_price', e.target.value)} min="0" step="1" placeholder={dv.totalPricePlaceholder} className={input} />
                  </Field>
                  <Field label={dv.advanceFee}>
                    <input type="number" value={form.accommodation_deposit} onChange={e => set('accommodation_deposit', e.target.value)} min="0" step="1" placeholder={dv.advanceFeePlaceholder} className={input} />
                  </Field>
                </>
              ) : (
                <Field label={isEvent ? de.price : d.entryFee}>
                  <input type="number" value={form.entry_fee} onChange={e => set('entry_fee', e.target.value)} min="0" step="0.5"
                    placeholder={isEvent ? de.pricePlaceholder : undefined} className={input} />
                </Field>
              )}
              {isEvent && (
                <Field label={de.advance}>
                  <input type="number" value={form.advance_fee} onChange={e => set('advance_fee', e.target.value)} min="0" step="1" placeholder={de.advancePlaceholder} className={input} />
                </Field>
              )}
            </div>
            <PaymentMethodsDropdown
              accounts={paymentMethods}
              selected={bankAccountIds}
              onChange={setBankAccountIds}
              label={de.bankAccountsSection}
              hint={de.bankAccountsHint}
              empty={de.noBankAccounts}
            />
          </Section>

          {/* Only hikes and via ferratas: getting there, the route and where everyone sleeps. */}
          {(isHike || isViaFerrata) && (
            <Section title={isHike ? types.hikeDetails : types.viaFerrataDetails}>
              {isHike && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={d.difficulty}>
                    <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} className={input}>
                      <option value="">{d.selectDifficulty}</option>
                      {(['easy', 'easy_medium', 'medium', 'medium_hard', 'hard'] as const).map(k => (
                        <option key={k} value={k}>{diffs[k]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={d.mountainRange}>
                    <input value={form.mountain_range} onChange={e => set('mountain_range', e.target.value)} placeholder={d.mountainRangePlaceholder} className={input} />
                  </Field>
                </div>
              )}
              {isViaFerrata && (
                <Field label={dv.groupCount}>
                  <input type="number" value={form.group_count} onChange={e => set('group_count', e.target.value)} min="1" step="1" placeholder={dv.groupCountPlaceholder} className={input} />
                </Field>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={d.startingPoint}>
                  <input value={form.starting_point} onChange={e => set('starting_point', e.target.value)} placeholder={d.startingPointPlaceholder} className={input} />
                </Field>
                <Field label={d.duration}>
                  <input type="number" value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)} placeholder={d.durationPlaceholder} step="0.5" min="0" className={input} />
                </Field>
                <Field label={d.peoplePerCar}>
                  <input type="number" value={form.people_per_car} onChange={e => set('people_per_car', e.target.value)} min="1" className={input} />
                </Field>
                <Field label={d.carsNeeded}>
                  <input type="number" value={form.cars_needed} onChange={e => set('cars_needed', e.target.value)} min="0" className={input} />
                </Field>
              </div>
              {isHike && <HikeStayFields form={form} set={set} timeLocale={timeLocale} />}
              {isHike && (
                <Field label={d.approximateGpx}>
                  <FileInput accept=".gpx,.kml" file={gpxApproxFile} onFile={setGpxApproxFile} hint={d.approximateGpxHint} uploadLabel={d.clickToUpload} />
                </Field>
              )}
            </Section>
          )}

          {!isSport && <Section title={isHike ? d.essentials : isViaFerrata ? dv.routes : de.whatToBring}>
            <Field label={isHike ? d.essentialsLabel : isViaFerrata ? dv.routes : de.whatToBring}>
              <textarea value={form.essentials} onChange={e => set('essentials', e.target.value)} rows={isEvent ? 3 : 5}
                placeholder={isHike ? d.essentialsPlaceholder : isViaFerrata ? dv.routesPlaceholder : de.whatToBringPlaceholder} className={input} />
              {!isEvent && <p className="text-xs text-stone-400 mt-1.5">{isHike ? d.essentialsHint : dv.routesHint}</p>}
            </Field>
          </Section>}

          <Section title={d.mediaRoutes}>
            <Field label={d.coverPhoto}>
              <FileInput accept="image/*" file={coverFile} onFile={setCoverFile} hint={d.coverPhotoHint} uploadLabel={d.clickToUpload} />
              {defaultCover && !coverFile && (
                <div className="mt-2 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-2 pr-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={defaultCover} alt="" className="h-12 w-20 rounded-lg object-cover shrink-0" />
                  <p className="text-xs text-emerald-800">{dp.willUse.replace('{category}', form.category)}</p>
                </div>
              )}
            </Field>
            {!isEvent && (
              <Field label={d.coverPhoto2}>
                <FileInput accept="image/*" file={coverFile2} onFile={setCoverFile2} hint={d.coverPhotoHint} uploadLabel={d.clickToUpload} />
              </Field>
            )}
            {!isSport && (
              <Field label={d.whatsappGroupUrl}>
                <input type="url" value={form.whatsapp_group_url} onChange={e => set('whatsapp_group_url', e.target.value)} placeholder={d.whatsappGroupUrlPlaceholder} className={input} />
              </Field>
            )}
            {isHike && (
              <Field label={d.externalAlbum}>
                <input type="url" value={form.external_photos_url} onChange={e => set('external_photos_url', e.target.value)} placeholder={d.externalAlbumPlaceholder} className={input} />
              </Field>
            )}
          </Section>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}
          <p className="text-xs text-stone-400">{de.createdHint}</p>

          <div className="flex gap-4">
            <button type="button" onClick={() => router.back()}
              className="flex-1 border border-stone-200 text-stone-700 py-3 rounded-xl font-semibold hover:bg-stone-50">
              {d.cancel}
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60">
              {isPending ? de.creating : de.create}
            </button>
          </div>
        </>
      )}
    </form>
  )
}

type StayForm = {
  has_camping: boolean; camping_details: string; camping_url: string; camping_price: string
  has_accommodation: boolean; accommodation_details: string; accommodation_url: string
  accommodation_price: string; accommodation_deposit: string; breakfast_time: string; dinner_time: string
  check_in_time: string; check_out_time: string; double_room_count: string; triple_room_count: string; quadruple_room_count: string
}

/** A hike's camping and accommodation, each shown once ticked. */
function HikeStayFields<F extends StayForm>({ form, set, timeLocale }: {
  form: F
  set: (field: keyof StayForm, value: string | boolean) => void
  timeLocale: string
}) {
  const d = useDict().admin.newHike
  const time = (field: 'breakfast_time' | 'dinner_time' | 'check_in_time' | 'check_out_time', label: string) => (
    <Field label={label}>
      <input type="time" lang={timeLocale} value={form[field]} onChange={e => set(field, e.target.value)} className={input} />
    </Field>
  )
  const count = (field: 'double_room_count' | 'triple_room_count' | 'quadruple_room_count', label: string) => (
    <Field label={label}>
      <input type="number" value={form[field]} onChange={e => set(field, e.target.value)} min="0" step="1" className={input} />
    </Field>
  )
  return (
    <>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={d.accommodationPrice}>
              <input type="number" value={form.accommodation_price} onChange={e => set('accommodation_price', e.target.value)} min="0" step="1" placeholder={d.accommodationPricePlaceholder} className={input} />
            </Field>
            <Field label={d.accommodationDeposit}>
              <input type="number" value={form.accommodation_deposit} onChange={e => set('accommodation_deposit', e.target.value)} min="0" step="1" placeholder={d.accommodationDepositPlaceholder} className={input} />
            </Field>
            {time('breakfast_time', d.breakfastTime)}
            {time('dinner_time', d.dinnerTime)}
            {time('check_in_time', d.checkInTime)}
            {time('check_out_time', d.checkOutTime)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {count('double_room_count', d.doubleRoomCount)}
            {count('triple_room_count', d.tripleRoomCount)}
            {count('quadruple_room_count', d.quadrupleRoomCount)}
          </div>
        </>
      )}
    </>
  )
}

const input = 'w-full border border-stone-200 rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white'

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
    // A label that wraps onto two lines (in a grid row) keeps its input level with its neighbours'.
    <div className="flex flex-col">
      <label className="block text-sm font-medium text-stone-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-auto">{children}</div>
    </div>
  )
}

function FileInput({ accept, file, onFile, hint, uploadLabel }: { accept: string; file: File | null; onFile: (f: File | null) => void; hint?: string; uploadLabel: string }) {
  return file ? (
    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
      <span className="text-emerald-700 font-medium text-sm flex-1 truncate">{file.name}</span>
      <button type="button" onClick={() => onFile(null)} aria-label="Remove"><X size={16} className="text-stone-400" /></button>
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
