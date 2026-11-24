'use client'

import { useMemo, useState } from 'react'
import {
  BedDouble, Car, CheckCircle2, Fuel, ChevronDown, CreditCard, FileText, FileX, LogOut, Search, Timer, UserMinus, UserPlus,
  ArrowRightLeft, type LucideIcon,
} from 'lucide-react'
import type { Dictionary } from '@/lib/i18n'

export type HistoryEntry = {
  id: string
  at: string
  action: string
  fromStatus: string | null
  toStatus: string | null
  actor: string
  actorName: string | null
  details: Record<string, unknown> | null
}
export type HistoryPerson = {
  key: string
  name: string
  friendOf: string | null
  current: string | null // their status now, null when no longer signed up
  gone: 'dropped' | 'removed' | null
  entries: HistoryEntry[]
}

type Dict = Dictionary['admin']['participantLog']

const ICON: Record<string, { Icon: LucideIcon; tone: string }> = {
  joined: { Icon: UserPlus, tone: 'bg-emerald-100 text-emerald-700' },
  added: { Icon: UserPlus, tone: 'bg-emerald-100 text-emerald-700' },
  imported: { Icon: UserPlus, tone: 'bg-emerald-100 text-emerald-700' },
  cancelled: { Icon: LogOut, tone: 'bg-red-100 text-red-700' },
  removed: { Icon: UserMinus, tone: 'bg-red-100 text-red-700' },
  status: { Icon: ArrowRightLeft, tone: 'bg-sky-100 text-sky-700' },
  payment: { Icon: CreditCard, tone: 'bg-emerald-100 text-emerald-700' },
  payment_expired: { Icon: Timer, tone: 'bg-amber-100 text-amber-700' },
  car: { Icon: Car, tone: 'bg-stone-100 text-stone-600' },
  ride: { Icon: Car, tone: 'bg-stone-100 text-stone-600' },
  gas: { Icon: Fuel, tone: 'bg-emerald-100 text-emerald-700' },
  room: { Icon: BedDouble, tone: 'bg-violet-100 text-violet-700' },
  document_uploaded: { Icon: FileText, tone: 'bg-stone-100 text-stone-600' },
  document_deleted: { Icon: FileX, tone: 'bg-stone-100 text-stone-600' },
}

const STATUS_TONE: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  waitlist: 'bg-sky-100 text-sky-700',
  rejected: 'bg-red-100 text-red-700',
}

const fill = (t: string, v: Record<string, unknown>) => t.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''))

function describe(e: HistoryEntry, dict: Dict, status: Record<string, string>): string {
  const d = e.details ?? {}
  const st = (s: string | null) => (s ? status[s] ?? s : '')
  switch (e.action) {
    case 'joined': return e.toStatus ? fill(dict.joinedAs, { status: st(e.toStatus) }) : dict.joined
    case 'cancelled': return dict.cancelled
    case 'removed': return dict.removed
    case 'added': return fill(dict.added, { status: st(e.toStatus) })
    case 'imported': return fill(dict.imported, { status: st(e.toStatus) })
    case 'status': {
      const text = e.fromStatus && e.fromStatus !== e.toStatus
        ? fill(dict.status, { from: st(e.fromStatus), to: st(e.toStatus) })
        : fill(dict.statusTo, { to: st(e.toStatus) })
      return d.all ? `${text} ${dict.confirmAll}` : text
    }
    case 'payment': return d.amount != null ? fill(dict.payment, { amount: d.amount }) : dict.paymentNoAmount
    case 'payment_expired': return dict.paymentExpired
    case 'car': {
      const text = d.bringsCar ? (d.carSeats ? fill(dict.carDriving, { seats: d.carSeats }) : dict.carDrivingNoSeats) : dict.carNot
      return typeof d.carTrip === 'string' ? `${text} · ${dict.trip[d.carTrip as keyof Dict['trip']] ?? d.carTrip}` : text
    }
    case 'ride': {
      const text = d.driver ? fill(dict.ride, { driver: d.driver }) : dict.rideNone
      return d.automatic ? `${text} ${dict.rideAuto}` : text
    }
    case 'gas':
      if (typeof d.exempt === 'boolean') return d.exempt ? dict.gasExempt : dict.gasNotExempt
      return d.paid ? dict.gasPaid : dict.gasUnpaid
    case 'room': return d.room ? fill(dict.room, { room: d.room }) : dict.roomNone
    case 'document_uploaded': return fill(dict.docUploaded, { file: d.file })
    case 'document_deleted': return fill(dict.docDeleted, { file: d.file })
    default: return e.action
  }
}

export default function ParticipantHistoryList({ people, dict, statusLabels, locale }: {
  people: HistoryPerson[]
  dict: Dict
  statusLabels: Record<string, string>
  locale: string
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'gone'>('all')
  const fmt = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), [locale])

  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const shown = people.filter(p =>
    (filter === 'all' || (filter === 'active' ? !p.gone : !!p.gone)) &&
    (!query.trim() || fold(p.name).includes(fold(query.trim()))))
  const goneCount = people.filter(p => p.gone).length

  if (!people.length) return <p className="text-sm text-stone-400 bg-white rounded-2xl border border-stone-200 p-6 text-center">{dict.empty}</p>

  const chip = (value: typeof filter, label: string, count: number) => (
    <button type="button" onClick={() => setFilter(value)}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === value ? 'bg-stone-800 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
      {label} <span className="opacity-60">{count}</span>
    </button>
  )

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border-b border-stone-100">
        <label className="flex items-center gap-2 flex-1 rounded-xl border border-stone-200 px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-500">
          <Search size={15} className="text-stone-400 shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={dict.search}
            className="w-full text-base sm:text-sm bg-transparent focus:outline-none" />
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {chip('all', dict.all, people.length)}
          {chip('active', dict.active, people.length - goneCount)}
          {chip('gone', dict.gone, goneCount)}
        </div>
      </div>

      {shown.length === 0 && <p className="text-sm text-stone-400 p-6 text-center">{dict.noMatch}</p>}

      <ul className="divide-y divide-stone-100">
        {shown.map(p => {
          const last = p.entries[p.entries.length - 1]
          return (
            <li key={p.key}>
              <details className="group">
                <summary className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 cursor-pointer list-none hover:bg-stone-50 [&::-webkit-details-marker]:hidden">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${p.gone ? 'bg-stone-100 text-stone-400' : 'bg-emerald-50 text-emerald-700'}`}>
                    {p.name.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-semibold leading-snug [overflow-wrap:anywhere] ${p.gone ? 'text-stone-500' : 'text-stone-800'}`}>{p.name}</span>
                    <span className="block text-xs text-stone-400">
                      {p.friendOf ? `${fill(dict.friendOf, { name: p.friendOf })} · ` : ''}
                      {p.entries.length === 1 ? dict.entriesOne : fill(dict.entries, { count: p.entries.length })} · {fmt.format(new Date(last.at))}
                    </span>
                  </span>
                  {p.gone
                    ? <span className="shrink-0 self-start sm:self-center rounded-full bg-red-50 text-red-600 px-2.5 py-1 text-xs font-semibold">{p.gone === 'removed' ? dict.removedBadge : dict.dropped}</span>
                    : p.current && <span className={`shrink-0 self-start sm:self-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[p.current] ?? 'bg-stone-100 text-stone-600'}`}>{statusLabels[p.current] ?? p.current}</span>}
                  <ChevronDown size={16} className="shrink-0 text-stone-400 transition-transform group-open:rotate-180" />
                </summary>

                <ol className="relative pl-4 pr-3 sm:pr-4 pb-4 pt-1 ml-[1.75rem] sm:ml-[1.9rem] border-l border-stone-200 space-y-3">
                  {p.entries.map(e => {
                    const look = ICON[e.action] ?? { Icon: CheckCircle2, tone: 'bg-stone-100 text-stone-600' }
                    return (
                      <li key={e.id} className="relative pl-5">
                        <span className={`absolute -left-[0.95rem] top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${look.tone}`}>
                          <look.Icon size={12} strokeWidth={2.4} />
                        </span>
                        <p className="text-sm text-stone-700">{describe(e, dict, statusLabels)}</p>
                        <p className="text-xs text-stone-400">
                          {fmt.format(new Date(e.at))} · {e.actor === 'admin' ? `${dict.byAdmin}${e.actorName ? ` · ${e.actorName}` : ''}` : e.actor === 'organizer' ? `${dict.byOrganizer}${e.actorName ? ` · ${e.actorName}` : ''}` : e.actor === 'system' ? dict.bySystem : dict.bySelf}
                          {e.details?.backfilled ? ` · ${dict.backfilled}` : ''}
                        </p>
                      </li>
                    )
                  })}
                </ol>
              </details>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
