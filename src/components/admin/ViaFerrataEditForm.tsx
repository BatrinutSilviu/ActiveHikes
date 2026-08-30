'use client'

import { useState, useTransition } from 'react'
import { updateHike } from '@/app/actions/hikes'
import { Upload, X } from 'lucide-react'

type ViaFerrataData = {
  id: string
  title: string
  destination: string
  description: string | null
  date: string
  maxParticipants: number
  durationHours: number | null
  startingPoint: string | null
  meetingPoint: string | null
  meetingTime: string | null
  groupCount: number | null
  essentials: string[]
  coverImageUrl: string | null
  coverImageUrl2: string | null
  totalPrice: number | null
  advanceFee: number | null
  whatsappGroupUrl: string | null
  bankAccountIds: string[]
}

type BankAccountOption = {
  id: string
  type: string
  bankName: string | null
  accountHolder: string
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
  maxParticipants: string
  totalPrice: string
  totalPricePlaceholder: string
  advanceFee: string
  advanceFeePlaceholder: string
  routes: string
  routesPlaceholder: string
  routesHint: string
  coverPhoto: string
  coverPhotoSet: string
  changeCoverPhoto: string
  coverPhoto2: string
  coverPhoto2Set: string
  changeCoverPhoto2: string
  startingPoint: string
  startingPointPlaceholder: string
  meetingPoint: string
  meetingPointPlaceholder: string
  meetingTime: string
  meetingTimePlaceholder: string
  groupCount: string
  groupCountPlaceholder: string
  whatsappGroupUrl: string
  whatsappGroupUrlPlaceholder: string
  bankAccountsSection: string
  bankAccountsHint: string
  noBankAccounts: string
  savedSuccessfully: string
  saveChanges: string
  saving: string
}

export default function ViaFerrataEditForm({ viaFerrata, bankAccounts, dict }: { viaFerrata: ViaFerrataData; bankAccounts: BankAccountOption[]; dict: ViaFerrataEditDict }) {
  const [form, setForm] = useState({
    title: viaFerrata.title,
    location: viaFerrata.destination,
    description: viaFerrata.description ?? '',
    date: viaFerrata.date.slice(0, 10),
    durationHours: viaFerrata.durationHours != null ? String(viaFerrata.durationHours) : '',
    maxParticipants: String(viaFerrata.maxParticipants),
    totalPrice: viaFerrata.totalPrice != null ? String(viaFerrata.totalPrice) : '',
    advanceFee: viaFerrata.advanceFee != null ? String(viaFerrata.advanceFee) : '',
    routes: viaFerrata.essentials.join('\n'),
    startingPoint: viaFerrata.startingPoint ?? '',
    meetingPoint: viaFerrata.meetingPoint ?? '',
    meetingTime: viaFerrata.meetingTime ?? '',
    groupCount: viaFerrata.groupCount != null ? String(viaFerrata.groupCount) : '',
    whatsappGroupUrl: viaFerrata.whatsappGroupUrl ?? '',
  })
  const [bankAccountIds, setBankAccountIds] = useState<string[]>(viaFerrata.bankAccountIds)
  const toggleBankAccount = (id: string) => setBankAccountIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverFile2, setCoverFile2] = useState<File | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      let coverImageUrl = viaFerrata.coverImageUrl
      let coverImageUrl2 = viaFerrata.coverImageUrl2
      if (coverFile) {
        const fd = new FormData()
        fd.append('file', coverFile)
        fd.append('bucket', 'hike-covers')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        coverImageUrl = (await res.json()).url
      }

      if (coverFile2) {
        const fd = new FormData()
        fd.append('file', coverFile2)
        fd.append('bucket', 'hike-covers')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        coverImageUrl2 = (await res.json()).url
      }

      await updateHike(viaFerrata.id, {
        title: form.title,
        destination: form.location,
        description: form.description || null,
        date: form.date,
        durationHours: form.durationHours ? parseFloat(form.durationHours) : null,
        maxParticipants: parseInt(form.maxParticipants),
        accommodationPrice: form.totalPrice ? parseFloat(form.totalPrice) : null,
        accommodationDeposit: form.advanceFee ? parseFloat(form.advanceFee) : null,
        essentials: form.routes.split('\n').map(s => s.trim()).filter(Boolean),
        startingPoint: form.startingPoint || null,
        meetingPoint: form.meetingPoint || null,
        meetingTime: form.meetingTime || null,
        groupCount: form.groupCount ? parseInt(form.groupCount) : null,
        whatsappGroupUrl: form.whatsappGroupUrl || null,
        bankAccountIds,
        coverImageUrl,
        coverImageUrl2,
      })

      setCoverFile(null)
      setCoverFile2(null)
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.startingPoint}</label>
          <input value={form.startingPoint} onChange={e => set('startingPoint', e.target.value)} placeholder={dict.startingPointPlaceholder} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.meetingPoint}</label>
          <input value={form.meetingPoint} onChange={e => set('meetingPoint', e.target.value)} placeholder={dict.meetingPointPlaceholder} className={cls} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.meetingTime}</label>
          <input value={form.meetingTime} onChange={e => set('meetingTime', e.target.value)} placeholder={dict.meetingTimePlaceholder} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.groupCount}</label>
          <input type="number" value={form.groupCount} onChange={e => set('groupCount', e.target.value)} min="1" step="1" placeholder={dict.groupCountPlaceholder} className={cls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.maxParticipants}</label>
        <input type="number" value={form.maxParticipants} onChange={e => set('maxParticipants', e.target.value)} min="1" className={cls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.totalPrice}</label>
          <input type="number" value={form.totalPrice} onChange={e => set('totalPrice', e.target.value)} min="0" step="1" placeholder={dict.totalPricePlaceholder} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{dict.advanceFee}</label>
          <input type="number" value={form.advanceFee} onChange={e => set('advanceFee', e.target.value)} min="0" step="1" placeholder={dict.advanceFeePlaceholder} className={cls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.routes}</label>
        <textarea value={form.routes} onChange={e => set('routes', e.target.value)}
          rows={5} placeholder={dict.routesPlaceholder} className={cls} />
        <p className="text-xs text-stone-400 mt-1.5">{dict.routesHint}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.whatsappGroupUrl}</label>
        <input type="url" value={form.whatsappGroupUrl} onChange={e => set('whatsappGroupUrl', e.target.value)} placeholder={dict.whatsappGroupUrlPlaceholder} className={cls} />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.bankAccountsSection}</label>
        <p className="text-xs text-stone-400 mb-2">{dict.bankAccountsHint}</p>
        {bankAccounts.length === 0 ? (
          <p className="text-sm text-stone-400">{dict.noBankAccounts}</p>
        ) : (
          <div className="space-y-2">
            {bankAccounts.map(account => {
              const methodLabel = account.type === 'revolut' ? 'Revolut' : account.type === 'btpay' ? 'BT Pay' : account.bankName
              return (
                <label key={account.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={bankAccountIds.includes(account.id)} onChange={() => toggleBankAccount(account.id)} className="w-4 h-4 accent-emerald-600" />
                  <span className="text-sm text-stone-700">{methodLabel} — {account.accountHolder}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

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
        {viaFerrata.coverImageUrl && !coverFile && (
          <div className="mt-1.5 flex items-center gap-2">
            <img src={viaFerrata.coverImageUrl} alt="" className="w-12 h-8 object-cover rounded" />
            <p className="text-xs text-emerald-600">{dict.coverPhotoSet}</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">{dict.coverPhoto2}</label>
        {coverFile2 ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <span className="text-emerald-700 text-sm flex-1 truncate">{coverFile2.name}</span>
            <button type="button" onClick={() => setCoverFile2(null)}><X size={14} className="text-stone-400" /></button>
          </div>
        ) : (
          <label className="flex items-center gap-2 border border-dashed border-stone-200 rounded-xl px-4 py-3 cursor-pointer hover:border-emerald-300 transition-colors">
            <Upload size={16} className="text-stone-400" />
            <span className="text-stone-500 text-sm">{dict.changeCoverPhoto2}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && setCoverFile2(e.target.files[0])} />
          </label>
        )}
        {viaFerrata.coverImageUrl2 && !coverFile2 && (
          <div className="mt-1.5 flex items-center gap-2">
            <img src={viaFerrata.coverImageUrl2} alt="" className="w-12 h-8 object-cover rounded" />
            <p className="text-xs text-emerald-600">{dict.coverPhoto2Set}</p>
          </div>
        )}
      </div>

      {success && <p className="text-emerald-600 text-sm font-medium">{dict.savedSuccessfully}</p>}

      <button type="submit" disabled={isPending}
        className="w-full bg-stone-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-900 disabled:opacity-60">
        {isPending ? dict.saving : dict.saveChanges}
      </button>
    </form>
  )
}
