import type { HikeType } from '@prisma/client'

// Hikes and Via Ferrata events share one table but live under different URLs
// (/hikes/… and /via-ferrata/…, also under /admin and /api).
export const EVENT_PATH: Record<HikeType, string> = {
  hike: 'hikes',
  via_ferrata: 'via-ferrata',
}

/** The endpoint the event pages poll for live spot counts. */
export function spotsApiUrl(type: HikeType, eventId: string): string {
  return `/api/${EVENT_PATH[type]}/${eventId}/spots`
}
