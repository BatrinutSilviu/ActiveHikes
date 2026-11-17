import 'server-only'
import { prisma } from '@/lib/db'

// Default cover photos per kind of general event (see EventCategoryCover in the schema): a general
// event with no cover photo of its own shows its kind's one wherever it's listed or shown.

export const coverKey = (category: string) => category.trim().toLowerCase()

type CoverRow = { type: string; category: string | null; coverImageUrl: string | null }

/** The rows with each general event that has no cover photo of its own showing its kind's default one.
 *  Done when showing them (not stored), so changing a default updates every event that uses it. */
export async function withDefaultCovers<T extends CoverRow>(rows: T[]): Promise<T[]> {
  if (!rows.some(r => r.type === 'event' && !r.coverImageUrl && r.category)) return rows
  const covers = await allCategoryCovers()
  return rows.map(r => r.type === 'event' && !r.coverImageUrl && r.category && covers[coverKey(r.category)]
    ? { ...r, coverImageUrl: covers[coverKey(r.category)] } : r)
}

/** Every default cover, keyed by the kind's name in lower case. */
export async function allCategoryCovers(): Promise<Record<string, string>> {
  const rows = await prisma.eventCategoryCover.findMany()
  return Object.fromEntries(rows.map(r => [r.category, r.imageUrl]))
}
