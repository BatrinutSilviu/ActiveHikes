'use client'

import { useState, useTransition } from 'react'
import { updateParticipantStatus, confirmAllPending } from '@/app/actions/participants'
import { Check, X, List, CheckCheck, Car, Timer } from 'lucide-react'

type ParticipantStatus = 'pending' | 'confirmed' | 'rejected' | 'waitlist' | 'expired'

type Participant = {
  id: string
  hikeId: string
  status: ParticipantStatus
  joinedAt: string
  paymentDeadline?: string | null
  guestName?: string | null
  bringsCar?: boolean
  carSeats?: number | null
  carDriverParticipantId?: string | null
  user: { id: string; name: string | null; email: string | null; phone?: string | null }
}

type ParticipantManagerDict = {
  confirmAll: string
  confirming: string
  spotsFilled: string
  noRegistrations: string
  noSpotsAlert: string
  joined: string
  bringsCar: string
  payBy: string
  status: Record<string, string>
  actions: { confirm: string; waitlist: string; reject: string }
}

const STATUS_BADGE_CLASSES: Record<ParticipantStatus, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  waitlist: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-600',
  expired: 'bg-stone-200 text-stone-500',
}

export default function ParticipantManager({
  participants,
  hikeId,
  maxParticipants,
  dict,
}: {
  participants: Participant[]
  hikeId: string
  maxParticipants: number
  dict: ParticipantManagerDict
}) {
  const [items, setItems] = useState(participants)
  const [filter, setFilter] = useState('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [, startTransition] = useTransition()

  const confirmedCount = items.filter(p => p.status === 'confirmed').length

  const updateStatus = (participantId: string, newStatus: ParticipantStatus) => {
    if (newStatus === 'confirmed' && confirmedCount >= maxParticipants) {
      alert(dict.noSpotsAlert)
      return
    }
    setLoadingId(participantId)
    startTransition(async () => {
      await updateParticipantStatus(participantId, newStatus, hikeId)
      setItems(prev => prev.map(p => p.id === participantId ? { ...p, status: newStatus } : p))
      setLoadingId(null)
    })
  }

  const pendingCount = items.filter(p => p.status === 'pending').length

  const handleConfirmAll = async () => {
    setBulkLoading(true)
    const result = await confirmAllPending(hikeId)
    if (result.confirmed > 0) {
      setItems(prev => {
        let remaining = result.confirmed
        return prev.map(p => {
          if (p.status === 'pending' && remaining > 0) { remaining--; return { ...p, status: 'confirmed' as ParticipantStatus } }
          return p
        })
      })
    }
    setBulkLoading(false)
  }

  const filters: Array<'all' | ParticipantStatus> = ['all', 'pending', 'confirmed', 'waitlist', 'rejected', 'expired']
  const filtered = filter === 'all' ? items : items.filter(p => p.status === filter)

  if (items.length === 0) {
    return <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center text-stone-400">{dict.noRegistrations}</div>
  }

  return (
    <div className="space-y-3">
      {pendingCount > 0 && (
        <button onClick={handleConfirmAll} disabled={bulkLoading}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors text-sm">
          <CheckCheck size={16} />
          {bulkLoading ? dict.confirming : `${dict.confirmAll} (${pendingCount})`}
        </button>
      )}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-emerald-600 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}>
            {f === 'all' ? 'All' : (dict.status[f] ?? f)} ({f === 'all' ? items.length : items.filter(p => p.status === f).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="bg-white border border-stone-100 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-stone-800 truncate">
                  {p.user.name}
                  {p.guestName && (
                    <span className="ml-1.5 text-xs font-normal bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">+ {p.guestName}</span>
                  )}
                </div>
                <div className="text-stone-400 text-sm truncate">{p.user.email}</div>
                {p.user.phone && (
                  <a href={`https://wa.me/${p.user.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="text-emerald-600 text-xs hover:underline">{p.user.phone}</a>
                )}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-stone-400 text-xs">{dict.joined} {new Date(p.joinedAt).toLocaleDateString()}</span>
                  {p.status === 'pending' && p.paymentDeadline && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      <Timer size={11} /> {dict.payBy} {new Date(p.paymentDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {p.bringsCar && (
                    <span className="inline-flex items-center gap-1 text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">
                      <Car size={11} /> {dict.bringsCar}{p.carSeats != null ? ` (${p.carSeats})` : ''}
                    </span>
                  )}
                  {!p.bringsCar && p.carDriverParticipantId && (() => {
                    const driver = items.find(d => d.id === p.carDriverParticipantId)
                    return driver ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">
                        <Car size={11} /> {driver.user.name}
                      </span>
                    ) : null
                  })()}
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${STATUS_BADGE_CLASSES[p.status]}`}>
                {dict.status[p.status] ?? p.status}
              </span>
            </div>

            <div className="mt-3 flex gap-2 flex-wrap">
              {p.status !== 'confirmed' && (
                <button onClick={() => updateStatus(p.id, 'confirmed')} disabled={loadingId === p.id}
                  className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  <Check size={12} /> {dict.actions.confirm}
                </button>
              )}
              {p.status !== 'waitlist' && (
                <button onClick={() => updateStatus(p.id, 'waitlist')} disabled={loadingId === p.id}
                  className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-200 disabled:opacity-50">
                  <List size={12} /> {dict.actions.waitlist}
                </button>
              )}
              {p.status !== 'rejected' && (
                <button onClick={() => updateStatus(p.id, 'rejected')} disabled={loadingId === p.id}
                  className="flex items-center gap-1 bg-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-200 disabled:opacity-50">
                  <X size={12} /> {dict.actions.reject}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-stone-400 text-sm text-center">{confirmedCount}/{maxParticipants} {dict.spotsFilled}</div>
    </div>
  )
}
