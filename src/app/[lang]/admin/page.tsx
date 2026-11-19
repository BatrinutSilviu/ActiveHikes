import { prisma } from '@/lib/db'
import Link from 'next/link'
import type { HikeStatus, HikeType } from '@prisma/client'
import { Plus, Users, CalendarDays, CreditCard, ChevronRight, TrendingUp, Image as ImageIcon } from 'lucide-react'
import { getDictionary, hasLocale, type Dictionary } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { waitlistOverduePending } from '@/lib/expireParticipants'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'
import { DATE_SHORT, formatHikeDate, isPastEvent } from '@/lib/dates'
import { EVENT_PATH } from '@/lib/eventPaths'

type EventRow = {
  id: string
  type: HikeType
  category: string | null
  title: string
  date: Date
  endDate: Date | null
  meetingTime: string | null
  maxParticipants: number
  status: HikeStatus
}

export default async function AdminDashboard({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  await Promise.all([waitlistOverduePending(), advanceEventStatuses()])

  const [d, events, pendingCount, userCount, paymentsToReview] = await Promise.all([
    getDictionary(lang),
    // Every kind of event (hikes, via ferratas, general events) in the same lists.
    prisma.hike.findMany({
      orderBy: { date: 'asc' },
      select: { id: true, type: true, category: true, title: true, date: true, endDate: true, meetingTime: true, maxParticipants: true, status: true },
    }),
    prisma.hikeParticipant.count({ where: { status: 'pending' } }),
    prisma.user.count({ where: { role: 'user' } }),
    prisma.bankTransactionReview.count({ where: { status: 'open' } }),
  ])

  const drafts = events.filter(e => e.status === 'draft')
  const published = events.filter(e => e.status !== 'draft')
  const upcoming = published.filter(e => !isPastEvent(e.status, e.date, e.endDate))
  const past = published.filter(e => isPastEvent(e.status, e.date, e.endDate)).reverse().slice(0, 8)

  const da = d.admin.dashboard

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <p className="text-emerald-600 text-xs font-semibold uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">{da.title}</h1>
          <p className="text-stone-500 mt-1 text-sm">{da.subtitle}</p>
        </div>
        <Link href={`/${lang}/admin/events/new`}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-emerald-200 hover:shadow-md">
          <Plus size={17} /> {d.events.admin.newEvent}
        </Link>
      </div>

      {paymentsToReview > 0 && (
        <Link href={`/${lang}/admin/bank-accounts`}
          className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-8 hover:bg-amber-100 transition-colors">
          <span className="text-amber-800 text-sm font-semibold">{da.paymentsToReview}: {paymentsToReview}</span>
          <ChevronRight size={18} className="text-amber-600" />
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CalendarDays size={20} className="text-white" />
            </div>
            <TrendingUp size={16} className="text-emerald-200" />
          </div>
          <div className="text-4xl font-black">{upcoming.length}</div>
          <div className="text-emerald-100 text-sm font-medium mt-1">{da.upcomingCount}</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
              <CalendarDays size={20} className="text-stone-600" />
            </div>
          </div>
          <div className="text-4xl font-black text-stone-900">{published.length}</div>
          <div className="text-stone-500 text-sm font-medium mt-1">{da.totalEvents}</div>
        </div>

        <div className={`rounded-2xl p-6 shadow-sm border ${pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pendingCount > 0 ? 'bg-amber-100' : 'bg-stone-100'}`}>
              <Users size={20} className={pendingCount > 0 ? 'text-amber-600' : 'text-stone-500'} />
            </div>
            {pendingCount > 0 && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                {da.needsAttention}
              </span>
            )}
          </div>
          <div className={`text-4xl font-black ${pendingCount > 0 ? 'text-amber-600' : 'text-stone-900'}`}>{pendingCount}</div>
          <div className="text-stone-500 text-sm font-medium mt-1">{da.pendingConfirmations}</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
              <Users size={20} className="text-stone-600" />
            </div>
          </div>
          <div className="text-4xl font-black text-stone-900">{userCount}</div>
          <div className="text-stone-500 text-sm font-medium mt-1">{da.registeredUsers}</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <QuickLink href={`/${lang}/admin/events/new`} icon={<Plus size={17} />} label={d.events.admin.newEvent} />
        <QuickLink href={`/${lang}/admin/bank-accounts`} icon={<CreditCard size={17} />} label={da.bankAccounts} />
        <QuickLink href={`/${lang}/admin/participants`} icon={<Users size={17} />} label={da.allParticipants} />
        <QuickLink href={`/${lang}/admin/event-photos`} icon={<ImageIcon size={17} />} label={da.eventPhotos} />
      </div>

      {drafts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-amber-100">
            <h2 className="font-bold text-amber-800">{da.drafts}</h2>
          </div>
          <div className="divide-y divide-amber-100">
            {drafts.map(e => <EventRowLink key={e.id} event={e} lang={lang} d={d} tone="draft" />)}
          </div>
        </div>
      )}

      <EventList title={da.upcomingEvents} empty={da.noUpcoming} events={upcoming} lang={lang} d={d} />
      <EventList title={da.pastEvents} empty={da.noPast} events={past} lang={lang} d={d} tone="past" />
    </div>
  )
}

/** What kind of event it is, for the admin rows: Hike, Via Ferrata or the general event's kind. */
function typeLabel(event: EventRow, d: Dictionary): string {
  if (event.type === 'event') return event.category ?? d.events.types.event
  return d.events.types[event.type]
}

function EventList({ title, empty, events, lang, d, tone }: {
  title: string
  empty: string
  events: EventRow[]
  lang: string
  d: Dictionary
  tone?: 'past'
}) {
  return (
    <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-stone-100">
        <h2 className="font-bold text-stone-900">{title}</h2>
      </div>
      {events.length === 0 ? (
        <div className="px-6 py-12 text-center text-stone-400">
          <CalendarDays size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">{empty}</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-50">
          {events.map(e => <EventRowLink key={e.id} event={e} lang={lang} d={d} tone={tone} />)}
        </div>
      )}
    </div>
  )
}

const STATUS_COLOR: Partial<Record<HikeStatus, string>> = {
  completed: 'text-emerald-600',
  cancelled: 'text-red-400',
}

function EventRowLink({ event, lang, d, tone }: { event: EventRow; lang: string; d: Dictionary; tone?: 'draft' | 'past' }) {
  const da = d.admin.dashboard
  return (
    <Link href={`/${lang}/admin/${EVENT_PATH[event.type]}/${event.id}`}
      className={`flex items-center justify-between gap-3 px-6 py-4 transition-colors group ${tone === 'draft' ? 'hover:bg-amber-100/50' : 'hover:bg-stone-50'}`}>
      <div className="min-w-0">
        <div className={`font-semibold group-hover:text-emerald-700 transition-colors truncate ${tone === 'past' ? 'text-stone-700' : 'text-stone-800'}`}>{event.title}</div>
        <div className="text-stone-400 text-xs mt-0.5">
          <span className="font-semibold text-emerald-700">{typeLabel(event, d)}</span>
          {' · '}{formatHikeDate(event.date, event.endDate, d.locale, DATE_SHORT)}
          {event.meetingTime ? ` · ${event.meetingTime}` : ''}
          {' · '}
          {tone === 'past'
            ? <span className={STATUS_COLOR[event.status] ?? 'text-amber-500'}>{d.events.card.status[event.status as keyof typeof d.events.card.status] ?? event.status}</span>
            : <>{event.maxParticipants} {da.spots}</>}
        </div>
      </div>
      <ChevronRight size={17} className={`shrink-0 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all ${tone === 'draft' ? 'text-amber-400' : 'text-stone-300'}`} />
    </Link>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}
      className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl p-4 hover:border-emerald-200 hover:bg-emerald-50 transition-all group shadow-sm">
      <span className="text-emerald-600 w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors shrink-0">{icon}</span>
      <span className="font-medium text-stone-700 text-sm">{label}</span>
      <ChevronRight size={15} className="text-stone-300 ml-auto group-hover:text-emerald-400 transition-colors" />
    </Link>
  )
}
