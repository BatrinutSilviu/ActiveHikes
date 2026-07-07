import { prisma } from './db'

export const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000

export async function expireOverduePending() {
  await prisma.hikeParticipant.updateMany({
    where: { status: 'pending', paymentDeadline: { lt: new Date() } },
    data: { status: 'expired' },
  })
}
