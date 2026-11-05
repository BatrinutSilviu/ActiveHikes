import { prisma } from './db'
import { notifyManagement } from './managementSync'

export const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000

// Registrations not confirmed within the payment window drop to the waitlist.
export async function waitlistOverduePending() {
  const where = { status: 'pending' as const, paymentDeadline: { lt: new Date() } }
  const overdue = await prisma.hikeParticipant.findMany({ where, select: { hikeId: true }, distinct: ['hikeId'] })
  if (!overdue.length) return
  await prisma.hikeParticipant.updateMany({
    where,
    data: { status: 'waitlist', paymentDeadline: null, carDriverParticipantId: null },
  })
  for (const { hikeId } of overdue) notifyManagement(hikeId)
}
