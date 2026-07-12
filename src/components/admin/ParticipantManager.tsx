'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateParticipantStatus, confirmAllPending, adminAddParticipant, adminImportParticipant, removeFriend } from '@/app/actions/participants'
import { Check, X, List, CheckCheck, Car, Timer, UserPlus, UserMinus } from 'lucide-react'

type ParticipantStatus = 'pending' | 'confirmed' | 'rejected' | 'waitlist' | 'expired'

type Participant = {
  id: string
  hikeId: string
  status: ParticipantStatus
  joinedAt: string
  paymentDeadline?: string | null
  friendName?: string | null
  hostParticipantId?: string | null
  hostName?: string | null
  linkedFriend?: { id: string; name: string | null } | null
  bringsCar?: boolean
  carSeats?: number | null
  carDriverParticipantId?: string | null
  user: { id: string; name: string | null; email: string | null; phone?: string | null } | null
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
  friendOf: string
  removeFriend: string
  removeFriendConfirm: string
  status: Record<string, string>
  actions: { confirm: string; waitlist: string; reject: string }
  addParticipant: string
  addParticipantPlaceholder: string
  add: string
  adding: string
  importParticipant: string
  importParticipantPlaceholder: string
  import: string
  importing: string
  importedLabel: string
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
  const router = useRouter()
  const [items, setItems] = useState(participants)

  // router.refresh() re-fetches this component's props on the server, but
  // doesn't remount it — resync local state whenever the fresh list arrives.
  const [prevParticipants, setPrevParticipants] = useState(participants)
  if (participants !== prevParticipants) {
    setPrevParticipants(participants)
    setItems(participants)
  }
  const [filter, setFilter] = useState('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [, startTransition] = useTransition()
  const [newEmail, setNewEmail] = useState('')
  const [addError, setAddError] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    setIsAdding(true)
    startTransition(async () => {
      try {
        await adminAddParticipant(hikeId, newEmail)
        setNewEmail('')
        router.refresh()
      } catch (err: unknown) {
        setAddError(err instanceof Error ? err.message : 'Something went wrong')
      }
      setIsAdding(false)
    })
  }

  const [newName, setNewName] = useState('')
  const [importError, setImportError] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const handleImportParticipant = (e: React.FormEvent) => {
    e.preventDefault()
    setImportError('')
    setIsImporting(true)
    startTransition(async () => {
      try {
        await adminImportParticipant(hikeId, newName)
        setNewName('')
        router.refresh()
      } catch (err: unknown) {
        setImportError(err instanceof Error ? err.message : 'Something went wrong')
      }
      setIsImporting(false)
    })
  }

  const confirmedCount = items.filter(p => p.status === 'confirmed').length

  const updateStatus = (p: Participant, newStatus: ParticipantStatus) => {
    const siblingId = p.hostParticipantId ?? p.linkedFriend?.id ?? null
    const sibling = siblingId ? items.find(i => i.id === siblingId) ?? null : null

    if (newStatus === 'confirmed') {
      const additional = [p, sibling].filter((x): x is Participant => !!x && x.status !== 'confirmed').length
      if (confirmedCount + additional > maxParticipants) {
        alert(dict.noSpotsAlert)
        return
      }
    }

    setLoadingId(p.id)
    startTransition(async () => {
      await updateParticipantStatus(p.id, newStatus, hikeId)
      setItems(prev => prev.map(item => (item.id === p.id || item.id === siblingId) ? { ...item, status: newStatus } : item))
      setLoadingId(null)
    })
  }

  const pendingCount = items.filter(p => p.status === 'pending').length

  const handleConfirmAll = async () => {
    setBulkLoading(true)
    const result = await confirmAllPending(hikeId)
    if (result.confirmed > 0) router.refresh()
    setBulkLoading(false)
  }

  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null)
  const handleRemoveFriend = (hostId: string) => {
    if (!confirm(dict.removeFriendConfirm)) return
    setRemovingFriendId(hostId)
    startTransition(async () => {
      await removeFriend(hikeId, hostId)
      router.refresh()
    })
  }

  const filters: Array<'all' | ParticipantStatus> = ['all', 'pending', 'confirmed', 'waitlist', 'rejected', 'expired']
  const filtered = filter === 'all' ? items : items.filter(p => p.status === filter)

  const addForm = (
    <form onSubmit={handleAddParticipant} className="bg-white border border-stone-100 rounded-2xl p-4">
      <label className="block text-sm font-medium text-stone-700 mb-1.5">{dict.addParticipant}</label>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder={dict.addParticipantPlaceholder}
          className="flex-1 border border-stone-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button type="submit" disabled={isAdding}
          className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-900 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-60 transition-colors">
          <UserPlus size={14} /> {isAdding ? dict.adding : dict.add}
        </button>
      </div>
      {addError && <p className="text-red-600 text-xs mt-2">{addError}</p>}
    </form>
  )

  const importForm = (
    <form onSubmit={handleImportParticipant} className="bg-white border border-stone-100 rounded-2xl p-4">
      <label className="block text-sm font-medium text-stone-700 mb-1.5">{dict.importParticipant}</label>
      <div className="flex gap-2">
        <input
          type="text"
          required
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder={dict.importParticipantPlaceholder}
          className="flex-1 border border-stone-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button type="submit" disabled={isImporting}
          className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-900 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-60 transition-colors">
          <UserPlus size={14} /> {isImporting ? dict.importing : dict.import}
        </button>
      </div>
      {importError && <p className="text-red-600 text-xs mt-2">{importError}</p>}
    </form>
  )

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        {addForm}
        {importForm}
        <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center text-stone-400">{dict.noRegistrations}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {addForm}
      {importForm}
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
                  {p.user?.name ?? p.friendName}
                  {p.linkedFriend && (
                    <span className="ml-1.5 text-xs font-normal bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">+ {p.linkedFriend.name}</span>
                  )}
                </div>
                {p.hostParticipantId ? (
                  <div className="text-stone-400 text-sm truncate">{dict.friendOf} {p.hostName ?? '?'}</div>
                ) : p.user ? (
                  <>
                    <div className="text-stone-400 text-sm truncate">{p.user?.email}</div>
                    {p.user?.phone && (
                      <a href={`https://wa.me/${p.user.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="text-emerald-600 text-xs hover:underline">{p.user.phone}</a>
                    )}
                  </>
                ) : (
                  <div className="text-stone-400 text-sm truncate italic">{dict.importedLabel}</div>
                )}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-stone-400 text-xs">
                    {dict.joined} {new Date(p.joinedAt).toLocaleDateString()} {new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  {p.status === 'pending' && p.paymentDeadline && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      <Timer size={11} /> {dict.payBy} {new Date(p.paymentDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
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
                        <Car size={11} /> {driver.user?.name ?? driver.friendName}
                      </span>
                    ) : null
                  })()}
                  {p.linkedFriend && (
                    <button onClick={() => handleRemoveFriend(p.id)} disabled={removingFriendId === p.id}
                      className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full hover:bg-red-100 disabled:opacity-50">
                      <UserMinus size={11} /> {dict.removeFriend}
                    </button>
                  )}
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${STATUS_BADGE_CLASSES[p.status]}`}>
                {dict.status[p.status] ?? p.status}
              </span>
            </div>

            <div className="mt-3 flex gap-2 flex-wrap">
              {p.status !== 'confirmed' && (
                <button onClick={() => updateStatus(p, 'confirmed')} disabled={loadingId === p.id}
                  className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  <Check size={12} /> {dict.actions.confirm}
                </button>
              )}
              {p.status !== 'waitlist' && (
                <button onClick={() => updateStatus(p, 'waitlist')} disabled={loadingId === p.id}
                  className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-200 disabled:opacity-50">
                  <List size={12} /> {dict.actions.waitlist}
                </button>
              )}
              {p.status !== 'rejected' && (
                <button onClick={() => updateStatus(p, 'rejected')} disabled={loadingId === p.id}
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
