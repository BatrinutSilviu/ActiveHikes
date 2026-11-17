import { prisma } from './db'
import { notifyManagement } from './managementSync'
import { snapshotParticipants, systemActor, writeParticipantLog } from './participantLog'

export const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000

// Registrations not confirmed within the payment window drop to the waitlist.
export async function waitlistOverduePending() {
  const where = { status: 'pending' as const, paymentDeadline: { lt: new Date() } }
  const overdue = await prisma.hikeParticipant.findMany({ where, select: { id: true, hikeId: true } })
  if (!overdue.length) return
  const ids = overdue.map(o => o.id)
  const people = await snapshotParticipants(ids)
  // Only those still overdue now (another request may have handled them in the meantime).
  const { count } = await prisma.hikeParticipant.updateMany({
    where: { ...where, id: { in: ids } },
    data: { status: 'waitlist', paymentDeadline: null, carDriverParticipantId: null },
  })
  if (count) await writeParticipantLog(people.filter(p => p.status === 'pending'), { action: 'payment_expired', actor: systemActor, toStatus: 'waitlist' })
  for (const hikeId of new Set(overdue.map(o => o.hikeId))) notifyManagement(hikeId)
}
