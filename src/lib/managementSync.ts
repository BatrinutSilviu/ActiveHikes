import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { EVENT_PATH } from './eventPaths'

// Pushes hikes and via ferratas to the community's management app (management.activetimisoara.ro),
// which keeps a matching event with its date, price, place and confirmed participants.
// Configured with MANAGEMENT_SYNC_URL (e.g. https://management.activetimisoara.ro/api/integrations/events)
// and MANAGEMENT_SYNC_TOKEN (the same secret as the management app's INTEGRATION_TOKEN); does nothing
// without them. The management app decides what to do with each push (drafts are synced too),
// so this just sends the hike as it is now, whenever it or its participants change.
//
// Pushes are fire-and-forget and never fail the action that triggered them. Several changes to the same
// hike within a moment (e.g. "confirm all") are sent once.

const pending = new Map<string, ReturnType<typeof setTimeout>>()

export function notifyManagement(hikeId: string) {
  if (!process.env.MANAGEMENT_SYNC_URL || !process.env.MANAGEMENT_SYNC_TOKEN) return
  clearTimeout(pending.get(hikeId))
  pending.set(hikeId, setTimeout(() => {
    pending.delete(hikeId)
    pushHike(hikeId).catch((err) => logger.error('management sync push failed', { job: 'management-sync', hikeId, err }))
  }, 1500))
}

/** Sends one hike/event as it is now (or that it was deleted). Also used by the nightly resync. */
export async function pushHike(hikeId: string) {
  const hike = await prisma.hike.findUnique({ where: { id: hikeId } })
  const base = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
  const body = hike
    ? {
        source: 'hikes',
        id: hike.id,
        record: {
          ...hike,
          confirmedCount: await prisma.hikeParticipant.count({ where: { hikeId, status: 'confirmed' } }),
          url: base ? `${base}/ro/${EVENT_PATH[hike.type]}/${hike.id}` : null,
        },
      }
    : { source: 'hikes', id: hikeId, deleted: true }
  const res = await fetch(process.env.MANAGEMENT_SYNC_URL!, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.MANAGEMENT_SYNC_TOKEN}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`)
  logger.info('management sync pushed', { job: 'management-sync', hikeId, deleted: !hike })
}

/**
 * Sends every hike and event from yesterday on again, so a change whose push was lost (the management
 * app was down or restarting) is caught up. Called nightly by the server (api/integrations/resync).
 */
export async function resyncUpcoming(): Promise<{ sent: number; failed: string[] }> {
  const hikes = await prisma.hike.findMany({
    where: { date: { gte: new Date(Date.now() - 86_400_000) } },
    select: { id: true },
  })
  const failed: string[] = []
  for (const { id } of hikes) {
    await pushHike(id).catch((err: unknown) => { failed.push(`${id}: ${err instanceof Error ? err.message : err}`) })
  }
  return { sent: hikes.length - failed.length, failed }
}
