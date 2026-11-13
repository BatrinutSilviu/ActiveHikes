import { prisma } from '@/lib/db'
import GeneralEventCard, { toGeneralEventCardData } from '@/components/generalEvents/GeneralEventCard'
import EventListPage from '@/components/events/EventListPage'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { isPastEvent } from '@/lib/dates'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'

async function getAllEvents() {
  const events = await prisma.hike.findMany({
    where: { type: 'event', status: { not: 'draft' } },
    orderBy: { date: 'desc' },
    include: { participants: { select: { status: true } } },
  })
  return {
    // Soonest first for what's coming, most recent first for the history.
    upcoming: events.filter(e => !isPastEvent(e.status, e.date, e.endDate)).reverse().map(toGeneralEventCardData),
    past: events.filter(e => isPastEvent(e.status, e.date, e.endDate)).map(toGeneralEventCardData),
  }
}

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  await advanceEventStatuses()
  const [d, { upcoming, past }, filter] = await Promise.all([getDictionary(lang), getAllEvents(), searchParams])

  return (
    <EventListPage
      upcoming={upcoming}
      past={past}
      filter={filter}
      renderCard={event => <GeneralEventCard key={event.id} event={event} lang={lang} dict={d.events.card} />}
      locale={d.locale}
      dict={d.events.list}
    />
  )
}
