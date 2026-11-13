import Link from 'next/link'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { prisma } from '@/lib/db'
import { DATE_SHORT, formatHikeDate, isPastEvent } from '@/lib/dates'

// The admin dashboard's list of general events: drafts first, then what's coming.
export default async function AdminEventsSection({ lang, locale, dict, spotsLabel }: {
  lang: string
  locale: string
  dict: { upcomingEvents: string; draftEvents: string; noUpcoming: string; newEvent: string }
  spotsLabel: string
}) {
  const events = await prisma.hike.findMany({
    where: { type: 'event', status: { not: 'cancelled' } },
    orderBy: { date: 'asc' },
    select: { id: true, title: true, category: true, date: true, endDate: true, meetingTime: true, maxParticipants: true, status: true },
  })
  const drafts = events.filter(e => e.status === 'draft')
  const upcoming = events.filter(e => e.status !== 'draft' && !isPastEvent(e.status, e.date, e.endDate)).slice(0, 8)

  const row = (e: (typeof events)[number], draft: boolean) => (
    <Link key={e.id} href={`/${lang}/admin/events/${e.id}`}
      className={`flex items-center justify-between px-6 py-4 transition-colors group ${draft ? 'hover:bg-amber-100/50' : 'hover:bg-stone-50'}`}>
      <div className="min-w-0">
        <div className="font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors truncate">{e.title}</div>
        <div className="text-stone-400 text-xs mt-0.5">
          {e.category ? `${e.category} · ` : ''}
          {formatHikeDate(e.date, e.endDate, locale, DATE_SHORT)}
          {e.meetingTime ? ` · ${e.meetingTime}` : ''}
          {' · '}{e.maxParticipants} {spotsLabel}
        </div>
      </div>
      <ChevronRight size={17} className="text-stone-300 group-hover:text-emerald-500 shrink-0" />
    </Link>
  )

  return (
    <>
      {drafts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden shadow-sm mt-6">
          <div className="px-6 py-4 border-b border-amber-100"><h2 className="font-bold text-amber-800">{dict.draftEvents}</h2></div>
          <div className="divide-y divide-amber-100">{drafts.map(e => row(e, true))}</div>
        </div>
      )}
      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-bold text-stone-900">{dict.upcomingEvents}</h2>
          <Link href={`/${lang}/admin/events/new`} className="text-emerald-600 text-sm font-semibold hover:text-emerald-700 transition-colors">{dict.newEvent}</Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone-400">
            <CalendarDays size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{dict.noUpcoming}</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">{upcoming.map(e => row(e, false))}</div>
        )}
      </div>
    </>
  )
}
