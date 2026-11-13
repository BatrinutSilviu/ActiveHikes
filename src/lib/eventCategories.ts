import 'server-only'
import { prisma } from '@/lib/db'

/** The kinds of general event used so far (e.g. Running, Yoga), for the event form's suggestions. */
export async function eventCategories(): Promise<string[]> {
  const rows = await prisma.hike.findMany({
    where: { type: 'event', category: { not: null } },
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  })
  return rows.map(r => r.category!).filter(Boolean)
}
