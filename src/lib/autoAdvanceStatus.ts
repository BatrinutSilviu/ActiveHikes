import { prisma } from './db'
import { eventEndsAt, eventStartsAt } from './dates'

// Moves events through 'upcoming' → 'ongoing' → 'completed' based on the current time
// vs their start/end (see eventStartsAt/eventEndsAt) — admins no longer pick this
// manually. Runs on every page that shows an event's status, so a finished event is
// never shown as upcoming/ongoing anywhere. Drafts and cancelled events are left alone.
export async function advanceEventStatuses() {
  const active = await prisma.hike.findMany({
    where: { status: { in: ['upcoming', 'ongoing'] } },
    select: { id: true, status: true, date: true, endDate: true, meetingTime: true, durationHours: true },
  })
  const now = Date.now()
  const toCompleted: string[] = []
  const toOngoing: string[] = []
  const toUpcoming: string[] = []

  for (const e of active) {
    let next: 'upcoming' | 'ongoing' | 'completed'
    if (eventEndsAt(e.date, e.endDate, e).getTime() <= now) next = 'completed'
    else if (eventStartsAt(e.date, e).getTime() <= now) next = 'ongoing'
    else next = 'upcoming' // e.g. an admin moved the date into the future
    if (next === e.status) continue
    if (next === 'completed') toCompleted.push(e.id)
    else if (next === 'ongoing') toOngoing.push(e.id)
    else toUpcoming.push(e.id)
  }

  // Re-check the status in the WHERE so a concurrent admin change (e.g. cancel) wins.
  await Promise.all([
    toCompleted.length && prisma.hike.updateMany({
      where: { id: { in: toCompleted }, status: { in: ['upcoming', 'ongoing'] } },
      data: { status: 'completed' },
    }),
    toOngoing.length && prisma.hike.updateMany({
      where: { id: { in: toOngoing }, status: 'upcoming' },
      data: { status: 'ongoing' },
    }),
    toUpcoming.length && prisma.hike.updateMany({
      where: { id: { in: toUpcoming }, status: 'ongoing' },
      data: { status: 'upcoming' },
    }),
  ])
}
