'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X } from 'lucide-react'
import { createHike, updateHike } from '@/app/actions/hikes'
import { useFormDraft, uploadFile } from '@/hooks/useFormDraft'
import PaymentMethodsDropdown from '@/components/admin/PaymentMethodsDropdown'

// Creating and editing a general event (Hike rows of type 'event'). New events start as drafts.
// The place is kept in `destination`, the address in `meetingPoint`, the start time in `meetingTime`
// and the price per person in `entryFee`; a single-day event's duration comes from its start and end
// times, so it moves to "completed" when it ends.

export type GeneralEventData = {
  id: string
  title: string
  category: string | null
  place: string
  address: string | null
  description: string | null
  date: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  maxParticipants: number
  price: number
  advanceFee: number | null
  whatToBring: string[]
  whatsappGroupUrl: string | null
  coverImageUrl: string | null
  bankAccountIds: string[]
}

type BankAccountOption = { id: string; type: string; bankName: string | null; accountHolder: string }

export type EventFormDict = Record<
  | 'title' | 'titlePlaceholder' | 'category' | 'categoryPlaceholder' | 'categoryPick' | 'categoryHint' | 'place' | 'placePlaceholder' | 'address'
  | 'addressPlaceholder' | 'description' | 'descriptionPlaceholder' | 'date' | 'endDate' | 'startTime' | 'endTime'
  | 'maxParticipants' | 'price' | 'pricePlaceholder' | 'advance' | 'advancePlaceholder' | 'advanceTooHigh'
  | 'endBeforeStart' | 'whatToBring' | 'whatToBringPlaceholder' | 'whatsappGroupUrl' | 'coverPhoto' | 'chooseCoverPhoto'
  | 'coverPhotoSet' | 'bankAccountsSection' | 'bankAccountsHint' | 'noBankAccounts' | 'create' | 'creating' | 'createdHint'
  | 'saveChanges' | 'saving' | 'savedSuccessfully' | 'saveError' | 'draftRestored' | 'discardDraft',
  string
>

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Hours between the start and end times of a single-day event (null when it can't be told). */
function durationHours(f: { startTime: string; endTime: string; date: string; endDate: string }): number | null {
  if (!f.startTime || !f.endTime || (f.endDate && f.endDate !== f.date)) return null
  const minutes = toMinutes(f.endTime) - toMinutes(f.startTime)
  return minutes > 0 ? Math.round(minutes / 6) / 10 : null
}

export default function EventForm({ event, bankAccounts, categories = [], fromManagement = false, lang, dict }: {
  event?: GeneralEventData
  bankAccounts: BankAccountOption[]
  /** The management app's event types (its list is the source of truth), or, when it can't be reached,
   *  the kinds used here before. */
  categories?: string[]
  fromManagement?: boolean
  lang: string
  dict: EventFormDict
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: event?.title ?? '',
    category: event?.category ?? '',
    place: event?.place ?? '',
    address: event?.address ?? '',
    description: event?.description ?? '',
    date: event?.date.slice(0, 10) ?? '',
    endDate: event?.endDate?.slice(0, 10) ?? '',
    startTime: event?.startTime ?? '',
    endTime: event?.endTime ?? '',
    maxParticipants: String(event?.maxParticipants ?? 20),
    price: String(event?.price ?? 0),
    advanceFee: event?.advanceFee != null ? String(event.advanceFee) : '',
    whatToBring: event?.whatToBring.join('\n') ?? '',
    whatsappGroupUrl: event?.whatsappGroupUrl ?? '',
  })
  const [bankAccountIds, setBankAccountIds] = useState<string[]>(event?.bankAccountIds ?? bankAccounts.map(a => a.id))
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const draft = useFormDraft(`event:${event?.id ?? 'new'}`, { form, bankAccountIds }, saved => {
    setForm(saved.form)
    setBankAccountIds(saved.bankAccountIds)
  })
  const set = (field: keyof typeof form, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    const price = parseFloat(form.price) || 0
    const advanceFee = form.advanceFee === '' ? null : parseFloat(form.advanceFee)
    if (advanceFee != null && advanceFee > price) { setError(dict.advanceTooHigh); return }
    const endsEarly = form.endDate ? form.endDate < form.date
      : !!(form.startTime && form.endTime && toMinutes(form.endTime) <= toMinutes(form.startTime))
    if (endsEarly) { setError(dict.endBeforeStart); return }

    startTransition(async () => {
      try {
        const coverImageUrl = coverFile ? await uploadFile(coverFile, 'hike-covers') : event?.coverImageUrl ?? null
        const fields = {
          title: form.title.trim(),
          destination: form.place.trim(),
          description: form.description.trim() || undefined,
          meetingPoint: form.address.trim() || undefined,
          meetingTime: form.startTime || undefined,
          maxParticipants: parseInt(form.maxParticipants) || 1,
          entryFee: price,
          essentials: form.whatToBring.split('\n').map(s => s.trim()).filter(Boolean),
          whatsappGroupUrl: form.whatsappGroupUrl.trim() || undefined,
          bankAccountIds,
          category: form.category.trim() || undefined,
          endTime: form.endTime || undefined,
        }
        if (event) {
          await updateHike(event.id, {
            ...fields,
            description: fields.description ?? null,
            meetingPoint: fields.meetingPoint ?? null,
            meetingTime: fields.meetingTime ?? null,
            whatsappGroupUrl: fields.whatsappGroupUrl ?? null,
            category: fields.category ?? null,
            endTime: fields.endTime ?? null,
            date: form.date,
            endDate: form.endDate || null,
            durationHours: durationHours(form),
            advanceFee,
            coverImageUrl,
          })
          draft.clearDraft({ form, bankAccountIds })
          setCoverFile(null)
          setSuccess(true)
          setTimeout(() => setSuccess(false), 3000)
          router.refresh()
        } else {
          const id = await createHike({
            ...fields,
            type: 'event',
            date: form.date,
            endDate: form.endDate || undefined,
            durationHours: durationHours(form) ?? undefined,
            advanceFee: advanceFee ?? undefined,
            coverImageUrl: coverImageUrl ?? undefined,
            hasCamping: false,
            hasAccommodation: false,
          })
          draft.clearDraft({ form, bankAccountIds })
          router.push(`/${lang}/admin/events/${id}`)
        }
      } catch (err) {
        setError(`${dict.saveError}${err instanceof Error && err.message ? ` (${err.message})` : ''}`)
      }
    })
  }

  const cls = 'w-full border border-stone-200 rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white'
  const label = 'block text-sm font-medium text-stone-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-stone-100 rounded-2xl p-5 space-y-4">
      {draft.restored && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <span className="text-amber-800 text-sm flex-1">{dict.draftRestored}</span>
          <button type="button" onClick={draft.discardDraft} className="text-sm font-medium text-amber-900 underline">{dict.discardDraft}</button>
        </div>
      )}

      <div>
        <label className={label}>{dict.title}</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder={dict.titlePlaceholder} className={cls} />
      </div>
      <div>
        <label className={label}>{dict.category}</label>
        {fromManagement ? (
          <select value={form.category} onChange={e => set('category', e.target.value)} required className={cls}>
            <option value="" disabled>{dict.categoryPick}</option>
            {/* An event saved before its kind was renamed or removed there still shows what it has. */}
            {[...categories, ...(form.category && !categories.includes(form.category) ? [form.category] : [])]
              .map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <>
            <input value={form.category} onChange={e => set('category', e.target.value)} required placeholder={dict.categoryPlaceholder}
              list="event-categories" className={cls} />
            <datalist id="event-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </>
        )}
        <p className="text-xs text-gray-500 mt-1">{dict.categoryHint}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>{dict.place}</label>
          <input value={form.place} onChange={e => set('place', e.target.value)} required placeholder={dict.placePlaceholder} className={cls} />
        </div>
        <div>
          <label className={label}>{dict.address}</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} placeholder={dict.addressPlaceholder} className={cls} />
        </div>
      </div>
      <div>
        <label className={label}>{dict.description}</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder={dict.descriptionPlaceholder} className={cls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>{dict.date}</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required min="2020-01-01" max="2099-12-31" className={cls} />
        </div>
        <div>
          <label className={label}>{dict.endDate}</label>
          <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} min={form.date || '2020-01-01'} max="2099-12-31" className={cls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>{dict.startTime}</label>
          <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className={cls} />
        </div>
        <div>
          <label className={label}>{dict.endTime}</label>
          <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} className={cls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={label}>{dict.maxParticipants}</label>
          <input type="number" value={form.maxParticipants} onChange={e => set('maxParticipants', e.target.value)} required min="1" step="1" className={cls} />
        </div>
        <div>
          <label className={label}>{dict.price}</label>
          <input type="number" value={form.price} onChange={e => set('price', e.target.value)} min="0" step="1" placeholder={dict.pricePlaceholder} className={cls} />
        </div>
        <div>
          <label className={label}>{dict.advance}</label>
          <input type="number" value={form.advanceFee} onChange={e => set('advanceFee', e.target.value)} min="0" step="1" placeholder={dict.advancePlaceholder} className={cls} />
        </div>
      </div>

      <div>
        <label className={label}>{dict.whatToBring}</label>
        <textarea value={form.whatToBring} onChange={e => set('whatToBring', e.target.value)} rows={3} placeholder={dict.whatToBringPlaceholder} className={cls} />
      </div>
      <div>
        <label className={label}>{dict.whatsappGroupUrl}</label>
        <input type="url" value={form.whatsappGroupUrl} onChange={e => set('whatsappGroupUrl', e.target.value)} placeholder="https://chat.whatsapp.com/…" className={cls} />
      </div>

      <PaymentMethodsDropdown
        accounts={bankAccounts}
        selected={bankAccountIds}
        onChange={setBankAccountIds}
        label={dict.bankAccountsSection}
        hint={dict.bankAccountsHint}
        empty={dict.noBankAccounts}
      />

      <div>
        <label className={label}>{dict.coverPhoto}</label>
        {coverFile ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <span className="text-emerald-700 text-sm flex-1 truncate">{coverFile.name}</span>
            <button type="button" onClick={() => setCoverFile(null)} aria-label="Remove"><X size={14} className="text-stone-400" /></button>
          </div>
        ) : (
          <label className="flex items-center gap-2 border border-dashed border-stone-200 rounded-xl px-4 py-3 cursor-pointer hover:border-emerald-300 transition-colors">
            <Upload size={16} className="text-stone-400" />
            <span className="text-stone-500 text-sm">{dict.chooseCoverPhoto}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && setCoverFile(e.target.files[0])} />
          </label>
        )}
        {event?.coverImageUrl && !coverFile && (
          <div className="mt-1.5 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.coverImageUrl} alt="" className="w-12 h-8 object-cover rounded" />
            <p className="text-xs text-emerald-600">{dict.coverPhotoSet}</p>
          </div>
        )}
      </div>

      {success && <p className="text-emerald-600 text-sm font-medium">{dict.savedSuccessfully}</p>}
      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
      {!event && <p className="text-xs text-stone-400">{dict.createdHint}</p>}

      <button type="submit" disabled={isPending}
        className="w-full bg-stone-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-900 disabled:opacity-60">
        {isPending ? (event ? dict.saving : dict.creating) : (event ? dict.saveChanges : dict.create)}
      </button>
    </form>
  )
}
