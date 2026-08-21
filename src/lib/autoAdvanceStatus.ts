import { prisma } from './db'

// Flips events between 'upcoming' and 'ongoing' based on today vs their start date —
// admins no longer pick this manually. Once started, an event stays 'ongoing'
// (even past a multi-day hike's endDate) until an admin marks it completed/cancelled.
export async function advanceEventStatuses() {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  await prisma.hike.updateMany({
    where: { status: 'upcoming', date: { lte: today } },
    data: { status: 'ongoing' },
  })
  await prisma.hike.updateMany({
    where: { status: 'ongoing', date: { gt: today } },
    data: { status: 'upcoming' },
  })
}
