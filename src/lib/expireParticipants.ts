import { prisma } from './db'

export const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000

// Registrations not confirmed within the payment window drop to the waitlist.
export async function waitlistOverduePending() {
  await prisma.hikeParticipant.updateMany({
    where: { status: 'pending', paymentDeadline: { lt: new Date() } },
    data: { status: 'waitlist', paymentDeadline: null, carDriverParticipantId: null },
  })
}
