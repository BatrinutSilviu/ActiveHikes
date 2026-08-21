import { prisma } from '@/lib/db'
import ViaFerrataCard from '@/components/viaFerrata/ViaFerrataCard'
import HikesFilter from '@/components/hikes/HikesFilter'
import { Mountain } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { isPastEvent } from '@/lib/dates'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'

async function getAllViaFerrata() {
  const events = await prisma.hike.findMany({
    where: { type: 'via_ferrata', status: { not: 'draft' } },
    orderBy: { date: 'desc' },
    include: { participants: { select: { status: true } } },
  })
  const serialize = (e: typeof events[0]) => ({
    id: e.id,
    title: e.title,
    location: e.destination,
    date: e.date.toISOString(),
    totalPrice: e.accommodationPrice ? Number(e.accommodationPrice) : null,
    advanceFee: e.accommodationDeposit ? Number(e.accommodationDeposit) : null,
    maxParticipants: e.maxParticipants,
    durationHours: e.durationHours ? Number(e.durationHours) : null,
    status: e.status,
    confirmedCount: e.participants.filter(p => p.status === 'confirmed').length,
    waitlistCount: e.participants.filter(p => p.status === 'waitlist').length,
    coverImageUrl: e.coverImageUrl,
  })
  return {
    upcoming: events.filter(e => !isPastEvent(e.status, e.date)).reverse().map(serialize),
    past: events.filter(e => isPastEvent(e.status, e.date)).map(serialize),
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
  const [d, { upcoming, past }, sp] = await Promise.all([
    getDictionary(lang),
    getAllViaFerrata(),
    searchParams,
  ])

  const filterYear = sp.year ? Number(sp.year) : null
  const filterMonth = sp.month ? Number(sp.month) : null

  const filteredPast = past.filter(e => {
    const date = new Date(e.date)
    if (filterYear && date.getFullYear() !== filterYear) return false
    if (filterMonth && date.getMonth() + 1 !== filterMonth) return false
    return true
  })

  const dateMap: Record<number, number[]> = {}
  for (const e of past) {
    const ed = new Date(e.date)
    const y = ed.getFullYear()
    const m = ed.getMonth() + 1
    if (!dateMap[y]) dateMap[y] = []
    if (!dateMap[y].includes(m)) dateMap[y].push(m)
  }
  for (const y of Object.keys(dateMap)) {
    dateMap[Number(y)].sort((a, b) => a - b)
  }

  return (
    <div>
      <div className="relative bg-stone-950 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">{d.viaFerrata.title}</h1>
          <p className="text-stone-400">{d.viaFerrata.subtitle}</p>
        </div>
      </div>

    <div className="max-w-6xl mx-auto px-4 py-12">

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> {d.viaFerrata.upcoming}
        </h2>
        {upcoming.length === 0 ? (
          <div className="text-center py-12 text-stone-400 bg-white rounded-2xl border border-stone-100">
            <Mountain size={40} className="mx-auto mb-3 opacity-30" />
            <p>{d.viaFerrata.noUpcoming}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map(event => <ViaFerrataCard key={event.id} viaFerrata={event as any} lang={lang} dict={d.viaFerrataCard} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-stone-400" /> {d.viaFerrata.history}
          </h2>

          <Suspense>
            <HikesFilter dateMap={dateMap} locale={d.locale} dict={{ filterAll: d.viaFerrata.filterAll }} />
          </Suspense>

          {filteredPast.length === 0 ? (
            <div className="text-center py-12 text-stone-400 bg-white rounded-2xl border border-stone-100">
              <Mountain size={40} className="mx-auto mb-3 opacity-30" />
              <p>{d.viaFerrata.noResults}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPast.map(event => <ViaFerrataCard key={event.id} viaFerrata={event as any} lang={lang} dict={d.viaFerrataCard} />)}
            </div>
          )}
        </section>
      )}
    </div>
    </div>
  )
}
