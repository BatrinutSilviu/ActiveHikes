import 'server-only'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

// The kinds of general event (Running, Social…) are the management app's event types: it's their source
// of truth, so a new kind is added there (Sports page), never typed here. Read from its public list,
// at the same host as MANAGEMENT_SYNC_URL. Padel and Hiking are left out: those events live in their own apps.
const OWNED_ELSEWHERE = new Set(['padel', 'hiking'])

async function managementEventTypes(): Promise<string[] | null> {
  const syncUrl = process.env.MANAGEMENT_SYNC_URL
  if (!syncUrl) return null
  try {
    const res = await fetch(new URL('/api/public/event-types', syncUrl), {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) throw new Error(`management answered ${res.status}`)
    const body = (await res.json()) as { eventTypes: { name: string }[] }
    return body.eventTypes.map(t => t.name).filter(n => !OWNED_ELSEWHERE.has(n.toLowerCase()))
  } catch (err) {
    logger.warn('Could not read the event types from the management app', { err })
    return null
  }
}

/** The kinds of event to pick from, with whether the list came from the management app. If it can't be
 *  reached, the kinds already used here stand in, so events can still be made. */
export async function eventCategories(): Promise<{ categories: string[]; fromManagement: boolean }> {
  const fromManagement = await managementEventTypes()
  if (fromManagement) return { categories: fromManagement, fromManagement: true }
  const rows = await prisma.hike.findMany({
    where: { type: 'event', category: { not: null } },
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  })
  return { categories: rows.map(r => r.category!).filter(Boolean), fromManagement: false }
}

/** The category as the management app spells it. Throws when it isn't one of its event types; when the
 *  list can't be read, the category is kept as given (the management app files unknown ones under Other). */
export async function canonicalCategory(category: string): Promise<string> {
  const list = await managementEventTypes()
  if (!list) return category
  const match = list.find(n => n.toLowerCase() === category.toLowerCase())
  if (!match) throw new Error(`Unknown kind of event: ${category}. Add it in the management app first.`)
  return match
}
