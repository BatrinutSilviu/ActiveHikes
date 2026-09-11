'use client'

import { useState, useTransition } from 'react'
import { listRevolutInstitutions, connectRevolut, disconnectRevolut, syncRevolutNow } from '@/app/actions/bankConnection'
import { Link2, RefreshCw, Unlink } from 'lucide-react'

type Connection = {
  status: 'pending' | 'linked' | 'expired'
  institutionName: string | null
  linkedAt: string | null
  consentExpiresAt: string | null
  lastSyncedAt: string | null
  lastMatchedCount: number | null
  lastUnmatchedCount: number | null
} | null

type Dict = {
  title: string
  hint: string
  connectButton: string
  connecting: string
  noInstitutionFound: string
  chooseInstitution: string
  continueButton: string
  linkedLabel: string
  consentValidLabel: string
  lastSyncedLabel: string
  never: string
  confirmedCountLabel: string
  unmatchedCountLabel: string
  syncNowButton: string
  syncing: string
  disconnectButton: string
  disconnectConfirm: string
  expiredNotice: string
  connectError: string
}

export default function RevolutConnection({ connection, dict, locale }: { connection: Connection; dict: Dict; locale: string }) {
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[] | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')
  const [syncResult, setSyncResult] = useState<{ confirmed: number; unmatched: number } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleStartConnect = () => {
    setError('')
    startTransition(async () => {
      const found = await listRevolutInstitutions()
      if (found.length === 0) {
        setError(dict.noInstitutionFound)
        return
      }
      if (found.length === 1) {
        await proceedConnect(found[0].id, found[0].name)
        return
      }
      setInstitutions(found)
    })
  }

  const proceedConnect = async (id: string, name: string) => {
    try {
      const { link } = await connectRevolut(id, name)
      window.location.href = link
    } catch {
      setError(dict.connectError)
    }
  }

  const handleContinue = () => {
    const chosen = institutions?.find(i => i.id === selectedId)
    if (!chosen) return
    startTransition(() => proceedConnect(chosen.id, chosen.name))
  }

  const handleDisconnect = () => {
    if (!confirm(dict.disconnectConfirm)) return
    startTransition(async () => {
      await disconnectRevolut()
      window.location.reload()
    })
  }

  const handleSyncNow = () => {
    setSyncResult(null)
    startTransition(async () => {
      const result = await syncRevolutNow()
      setSyncResult(result ?? { confirmed: 0, unmatched: 0 })
    })
  }

  const dateLocale = locale === 'en' ? 'en-GB' : 'ro-RO'
  const formatDate = (iso: string | null) => iso ? new Date(iso).toLocaleString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : dict.never

  const isLinked = connection?.status === 'linked'

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="font-bold text-stone-800 text-lg">{dict.title}</h2>
        <p className="text-stone-500 text-sm mt-1">{dict.hint}</p>
      </div>

      {connection?.status === 'expired' && (
        <p className="text-amber-700 text-sm bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">{dict.expiredNotice}</p>
      )}

      {isLinked ? (
        <div className="space-y-3">
          <div className="text-sm text-stone-600 space-y-1">
            <div><span className="text-stone-400">{dict.linkedLabel}:</span> {formatDate(connection.linkedAt)}</div>
            <div><span className="text-stone-400">{dict.consentValidLabel}:</span> {formatDate(connection.consentExpiresAt)}</div>
            <div><span className="text-stone-400">{dict.lastSyncedLabel}:</span> {formatDate(connection.lastSyncedAt)}
              {connection.lastSyncedAt && (
                <span className="text-stone-400">
                  {' '}({connection.lastMatchedCount ?? 0} {dict.confirmedCountLabel} / {connection.lastUnmatchedCount ?? 0} {dict.unmatchedCountLabel})
                </span>
              )}
            </div>
          </div>

          {syncResult && (
            <p className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
              {syncResult.confirmed} {dict.confirmedCountLabel} · {syncResult.unmatched} {dict.unmatchedCountLabel}
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={handleSyncNow} disabled={isPending}
              className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-stone-900 disabled:opacity-60">
              <RefreshCw size={15} /> {isPending ? dict.syncing : dict.syncNowButton}
            </button>
            <button onClick={handleDisconnect} disabled={isPending}
              className="flex items-center gap-2 border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-stone-50 disabled:opacity-60">
              <Unlink size={15} /> {dict.disconnectButton}
            </button>
          </div>
        </div>
      ) : institutions ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">{dict.chooseInstitution}</option>
            {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <button onClick={handleContinue} disabled={!selectedId || isPending}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
            {dict.continueButton}
          </button>
        </div>
      ) : (
        <button onClick={handleStartConnect} disabled={isPending}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
          <Link2 size={16} /> {isPending ? dict.connecting : dict.connectButton}
        </button>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
