import { prisma } from '@/lib/db'
import HikeCard from '@/components/HikeCard'
import HikesFilter from '@/components/hikes/HikesFilter'
import { Mountain } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

async function getAllHikes() {
  const hikes = await prisma.hike.findMany({
    orderBy: { date: 'desc' },
    include: { participants: { select: { status: true } } },
  })
  const serialize = (h: typeof hikes[0]) => ({
    ...h,
    date: h.date.toISOString(),
    endDate: h.endDate ? h.endDate.toISOString() : null,
    entryFee: Number(h.entryFee),
    durationHours: h.durationHours ? Number(h.durationHours) : null,
    confirmedCount: h.participants.filter(p => p.status === 'confirmed').length,
    waitlistCount: h.participants.filter(p => p.status === 'waitlist').length,
    participants: undefined,
  })
  return {
    upcoming: hikes.filter(h => h.status === 'upcoming' || h.status === 'ongoing').reverse().map(serialize),
    past: hikes.filter(h => h.status === 'completed' || h.status === 'cancelled').map(serialize),
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

  const [d, { upcoming, past }, sp] = await Promise.all([
    getDictionary(lang),
    getAllHikes(),
    searchParams,
  ])

  const filterYear = sp.year ? Number(sp.year) : null
  const filterMonth = sp.month ? Number(sp.month) : null

  const filteredPast = past.filter(h => {
    const d = new Date(h.date)
    if (filterYear && d.getFullYear() !== filterYear) return false
    if (filterMonth && d.getMonth() + 1 !== filterMonth) return false
    return true
  })

  // Build dateMap from all past hikes (not filtered) so all options stay visible
  const dateMap: Record<number, number[]> = {}
  for (const h of past) {
    const hd = new Date(h.date)
    const y = hd.getFullYear()
    const m = hd.getMonth() + 1
    if (!dateMap[y]) dateMap[y] = []
    if (!dateMap[y].includes(m)) dateMap[y].push(m)
  }
  for (const y of Object.keys(dateMap)) {
    dateMap[Number(y)].sort((a, b) => a - b)
  }

  return (
    <div>
      {/* Dark hero band */}
      <div className="relative bg-stone-950 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">{d.hikes.title}</h1>
          <p className="text-stone-400">{d.hikes.subtitle}</p>
        </div>
      </div>

    <div className="max-w-6xl mx-auto px-4 py-12">

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> {d.hikes.upcoming}
        </h2>
        {upcoming.length === 0 ? (
          <div className="text-center py-12 text-stone-400 bg-white rounded-2xl border border-stone-100">
            <Mountain size={40} className="mx-auto mb-3 opacity-30" />
            <p>{d.hikes.noUpcoming}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map(hike => <HikeCard key={hike.id} hike={hike as any} lang={lang} dict={d.hikeCard} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-stone-400" /> {d.hikes.history}
          </h2>

          <Suspense>
            <HikesFilter dateMap={dateMap} locale={d.locale} dict={{ filterAll: d.hikes.filterAll }} />
          </Suspense>

          {filteredPast.length === 0 ? (
            <div className="text-center py-12 text-stone-400 bg-white rounded-2xl border border-stone-100">
              <Mountain size={40} className="mx-auto mb-3 opacity-30" />
              <p>{d.hikes.noResults}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPast.map(hike => <HikeCard key={hike.id} hike={hike as any} lang={lang} dict={d.hikeCard} />)}
            </div>
          )}
        </section>
      )}
    </div>
    </div>
  )
}
