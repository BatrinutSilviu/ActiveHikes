import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { EVENT_PATH } from './eventPaths'
import { participantName } from './whatsappGroup'

const DAY = 86_400_000

// Pushes hikes, via ferratas and general events to the community's management app (management.activetimisoara.ro),
// which keeps a matching event with its date, price, place, confirmed participants and sign-up list.
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

// Only what the management app uses (its server/sync.js): never links or details meant for participants.
const SENT = {
  id: true, type: true, title: true, status: true, date: true, endDate: true, category: true, byMember: true,
  entryFee: true, hasAccommodation: true, accommodationPrice: true,
  destination: true, mountainRange: true, meetingPoint: true, meetingTime: true, endTime: true,
} as const

/** Sends one hike/event as it is now (or that it was deleted). Also used by the nightly resync. */
export async function pushHike(hikeId: string) {
  const hike = await prisma.hike.findUnique({ where: { id: hikeId }, select: SENT })
  const base = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
  const body = hike
    ? {
        source: 'hikes',
        id: hike.id,
        record: {
          ...hike,
          ...(await signUps(hikeId)),
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
 * The confirmed count, the sign-up list (everyone signed up but rejected, friends too; paid = confirmed) and who
 * pulled out: the latest
 * cancellation, removal or rejection of each person not on the list now (from the sign-up history), with when,
 * whether an admin/organiser did it and whether they'd been confirmed.
 */
async function signUps(hikeId: string) {
  const [list, logs] = await Promise.all([
    prisma.hikeParticipant.findMany({
      where: { hikeId, status: { not: 'rejected' } },
      select: { id: true, status: true, friendName: true, user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.participantLog.findMany({
      where: { hikeId, OR: [{ action: { in: ['cancelled', 'removed'] } }, { action: 'status', toStatus: 'rejected' }] },
      select: { personName: true, participantId: true, actor: true, fromStatus: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  const confirmedCount = list.filter((p) => p.status === 'confirmed').length
  // ref: the sign-up's id, so someone who renames their account stays the same attendee there.
  const players = list.map((p) => ({ name: participantName(p), ref: p.id, paid: p.status === 'confirmed' })).filter((p) => p.name !== '?')
  const onList = new Set(players.flatMap((p) => [p.name.toLowerCase(), p.ref]))
  const seen = new Set<string>()
  const withdrawals = logs.flatMap((l) => {
    const key = l.personName.toLowerCase()
    if (l.personName === '?' || onList.has(key) || (l.participantId && onList.has(l.participantId)) || seen.has(key)) return []
    seen.add(key)
    return [{ name: l.personName, ref: l.participantId, at: l.createdAt.toISOString(), byAdmin: l.actor === 'admin' || l.actor === 'organizer', paid: l.fromStatus === 'confirmed' }]
  })
  return { confirmedCount, players, withdrawals }
}

/**
 * Sends every hike and event from 7 days ago on, and every one still running, again, so a change whose push was lost (the management
 * app was down or restarting) is caught up. Called nightly by the server (api/integrations/resync). Unlike padel, no
 * list of known ids is sent: events can't be deleted here (only cancelled, which is pushed like any change).
 */
export async function resyncUpcoming(): Promise<{ sent: number; failed: string[] }> {
  const hikes = await prisma.hike.findMany({
    where: { OR: [{ date: { gte: new Date(Date.now() - 7 * DAY) } }, { endDate: { gte: new Date(Date.now() - DAY) } }] },
    select: { id: true },
  })
  const failed: string[] = []
  for (const { id } of hikes) {
    await pushHike(id).catch((err: unknown) => { failed.push(`${id}: ${err instanceof Error ? err.message : err}`) })
  }
  return { sent: hikes.length - failed.length, failed }
}
