import { prisma } from '@/lib/db'
import ViaFerrataCard, { toViaFerrataCardData } from '@/components/viaFerrata/ViaFerrataCard'
import EventListPage from '@/components/events/EventListPage'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { isPastEvent } from '@/lib/dates'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'

async function getAllViaFerrata() {
  const events = await prisma.hike.findMany({
    where: { type: 'via_ferrata', status: { not: 'draft' } },
    orderBy: { date: 'desc' },
    include: { participants: { select: { status: true } } },
  })
  return {
    // Soonest first for what's coming, most recent first for the history.
    upcoming: events.filter(e => !isPastEvent(e.status, e.date)).reverse().map(toViaFerrataCardData),
    past: events.filter(e => isPastEvent(e.status, e.date)).map(toViaFerrataCardData),
  }
}

export default async function ViaFerrataPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  await advanceEventStatuses()
  const [d, { upcoming, past }, filter] = await Promise.all([
    getDictionary(lang),
    getAllViaFerrata(),
    searchParams,
  ])

  return (
    <EventListPage
      upcoming={upcoming}
      past={past}
      filter={filter}
      renderCard={event => <ViaFerrataCard key={event.id} viaFerrata={event} lang={lang} dict={d.viaFerrataCard} />}
      locale={d.locale}
      dict={d.viaFerrata}
    />
  )
}
