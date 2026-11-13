import type { HikeType } from '@prisma/client'

// Hikes, Via Ferrata and general events share one table but live under different URLs
// (/hikes/…, /via-ferrata/… and /events/…, also under /admin and /api).
export const EVENT_PATH: Record<HikeType, string> = {
  hike: 'hikes',
  via_ferrata: 'via-ferrata',
  event: 'events',
}

/** The endpoint the event pages poll for live spot counts. */
export function spotsApiUrl(type: HikeType, eventId: string): string {
  return `/api/${EVENT_PATH[type]}/${eventId}/spots`
}
