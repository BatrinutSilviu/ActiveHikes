import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import AnyEventCard, { toAnyEventCardData } from '@/components/events/AnyEventCard'
import EventListPage from '@/components/events/EventListPage'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { isPastEvent } from '@/lib/dates'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'

// Every kind of event in one list: hikes, via ferratas and the general ones (running, yoga…).
// `?type=` narrows it to hike, via_ferrata or one kind of general event (its category).

function typeWhere(type: string | undefined): Prisma.HikeWhereInput {
  if (!type) return {}
  if (type === 'hike' || type === 'via_ferrata') return { type }
  return { type: 'event', category: { equals: type, mode: 'insensitive' } }
}

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ year?: string; month?: string; type?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  await advanceEventStatuses()
  const filter = await searchParams
  const [d, rows, categories] = await Promise.all([
    getDictionary(lang),
    prisma.hike.findMany({
      where: { status: { not: 'draft' }, ...typeWhere(filter.type) },
      orderBy: { date: 'desc' },
      include: { participants: { select: { status: true } } },
    }),
    // The kinds of general event that have something to show, for the filter.
    prisma.hike.findMany({
      where: { type: 'event', status: { not: 'draft' }, category: { not: null } },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    }),
  ])

  const isPast = (r: (typeof rows)[number]) => isPastEvent(r.status, r.date, r.endDate)
  // Soonest first for what's coming, most recent first for the history.
  const upcoming = rows.filter(r => !isPast(r)).reverse().map(toAnyEventCardData)
  const past = rows.filter(isPast).map(toAnyEventCardData)

  const types = [
    { value: undefined, label: d.events.list.filterAll },
    { value: 'hike', label: d.events.types.hike },
    { value: 'via_ferrata', label: d.events.types.via_ferrata },
    ...categories.map(c => ({ value: c.category!, label: c.category! })),
  ]
  const selected = filter.type?.toLowerCase()

  return (
    <EventListPage
      upcoming={upcoming}
      past={past}
      filter={filter}
      toolbar={
        <div className="flex flex-wrap gap-2 mb-10">
          {types.map(t => {
            const active = t.value?.toLowerCase() === selected
            return (
              <Link key={t.label} href={`/${lang}/events${t.value ? `?type=${encodeURIComponent(t.value)}` : ''}`}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900'}`}>
                {t.label}
              </Link>
            )
          })}
        </div>
      }
      renderCard={event => <AnyEventCard key={event.id} event={event} lang={lang} dict={d} />}
      locale={d.locale}
      dict={d.events.list}
    />
  )
}
