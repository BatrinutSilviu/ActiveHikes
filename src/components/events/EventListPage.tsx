import { Suspense } from 'react'
import { Mountain } from 'lucide-react'
import HikesFilter from '@/components/hikes/HikesFilter'

type ListedEvent = { id: string; date: string }

type EventListDict = {
  title: string
  subtitle: string
  upcoming: string
  noUpcoming: string
  history: string
  filterAll: string
  noResults: string
}

/**
 * The /hikes and /via-ferrata listings: upcoming events, then past ones that can be
 * narrowed to a year/month (from the `year`/`month` query string).
 */
export default function EventListPage<T extends ListedEvent>({
  upcoming,
  past,
  filter,
  renderCard,
  locale,
  dict,
}: {
  upcoming: T[]
  past: T[]
  filter: { year?: string; month?: string }
  renderCard: (event: T) => React.ReactNode
  locale: string
  dict: EventListDict
}) {
  const filterYear = filter.year ? Number(filter.year) : null
  const filterMonth = filter.month ? Number(filter.month) : null

  const filteredPast = past.filter(event => {
    const date = new Date(event.date)
    if (filterYear && date.getFullYear() !== filterYear) return false
    if (filterMonth && date.getMonth() + 1 !== filterMonth) return false
    return true
  })

  return (
    <div>
      {/* Dark hero band */}
      <div className="relative bg-stone-950 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">{dict.title}</h1>
          <p className="text-stone-400">{dict.subtitle}</p>
        </div>
      </div>

    <div className="max-w-6xl mx-auto px-4 py-12">

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> {dict.upcoming}
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState text={dict.noUpcoming} />
        ) : (
          <CardGrid>{upcoming.map(renderCard)}</CardGrid>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-stone-400" /> {dict.history}
          </h2>

          <Suspense>
            {/* Built from all past events (not the filtered ones) so every option stays available. */}
            <HikesFilter dateMap={yearMonthMap(past)} locale={locale} dict={{ filterAll: dict.filterAll }} />
          </Suspense>

          {filteredPast.length === 0 ? (
            <EmptyState text={dict.noResults} />
          ) : (
            <CardGrid>{filteredPast.map(renderCard)}</CardGrid>
          )}
        </section>
      )}
    </div>
    </div>
  )
}

/** Year → sorted months that have at least one of the events. */
function yearMonthMap(events: ListedEvent[]): Record<number, number[]> {
  const map: Record<number, number[]> = {}
  for (const event of events) {
    const date = new Date(event.date)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    if (!map[year]) map[year] = []
    if (!map[year].includes(month)) map[year].push(month)
  }
  for (const months of Object.values(map)) months.sort((a, b) => a - b)
  return map
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{children}</div>
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-stone-400 bg-white rounded-2xl border border-stone-100">
      <Mountain size={40} className="mx-auto mb-3 opacity-30" />
      <p>{text}</p>
    </div>
  )
}
