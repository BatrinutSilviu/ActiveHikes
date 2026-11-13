import { prisma } from '@/lib/db'
import HikeCard, { toHikeCardData } from '@/components/HikeCard'
import EventListPage from '@/components/events/EventListPage'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { isPastEvent } from '@/lib/dates'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'

async function getAllHikes() {
  const hikes = await prisma.hike.findMany({
    where: { type: 'hike', status: { not: 'draft' } },
    orderBy: { date: 'desc' },
    include: { participants: { select: { status: true } } },
  })
  return {
    // Soonest first for what's coming, most recent first for the history.
    upcoming: hikes.filter(h => !isPastEvent(h.status, h.date, h.endDate)).reverse().map(toHikeCardData),
    past: hikes.filter(h => isPastEvent(h.status, h.date, h.endDate)).map(toHikeCardData),
  }
}

export default async function HikesPage({
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
    getAllHikes(),
    searchParams,
  ])

  return (
    <EventListPage
      upcoming={upcoming}
      past={past}
      filter={filter}
      renderCard={hike => <HikeCard key={hike.id} hike={hike} lang={lang} dict={d.hikeCard} />}
      locale={d.locale}
      dict={d.hikes}
    />
  )
}
