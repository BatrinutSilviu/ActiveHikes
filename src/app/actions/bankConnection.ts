'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'
import { randomBytes } from 'crypto'
import { listInstitutions, startAuthorization, runPaymentSync, type Institution } from '@/lib/revolutSync'
import { confirmParticipant } from '@/lib/participantConfirm'
import { adminActor } from '@/lib/participantLog'

const COUNTRY = 'RO'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')
  return session
}

export async function listRevolutInstitutions(): Promise<Institution[]> {
  await requireAdmin()
  const institutions = await listInstitutions(COUNTRY)
  return institutions.filter(i => i.name.toLowerCase().includes('revolut'))
}

export async function connectRevolut(institutionId: string, institutionName: string): Promise<{ link: string }> {
  await requireAdmin()

  const reference = randomBytes(16).toString('hex')
  // Enable Banking requires an exact match against the app's registered
  // redirect URLs, so the correlation reference travels as the `state`
  // param instead of being appended to the URL (as it was for GoCardless).
  const redirectUrl = `${process.env.NEXTAUTH_URL}/api/bank-connection/callback`
  const { link } = await startAuthorization(institutionId, COUNTRY, redirectUrl, reference)

  await prisma.bankConnection.create({
    data: { institutionId, institutionName, reference, status: 'pending' },
  })

  return { link }
}

export async function disconnectRevolut() {
  await requireAdmin()
  await prisma.bankConnection.deleteMany({})
  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
}

export async function syncRevolutNow() {
  await requireAdmin()
  const result = await runPaymentSync()
  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
  return result
}

// Admin picked which registration an unclear payment belongs to: confirm them
// and remember the payment so the sync never looks at it again.
export async function assignBankTransaction(reviewId: string, participantId: string) {
  const session = await requireAdmin()

  const review = await prisma.bankTransactionReview.findUnique({ where: { id: reviewId } })
  if (!review || review.status !== 'open') throw new Error('Payment already handled')

  const participant = await prisma.hikeParticipant.findUnique({
    where: { id: participantId },
    select: { id: true, hikeId: true, matchedTransaction: { select: { id: true } } },
  })
  if (!participant) throw new Error('Participant not found')

  await confirmParticipant(participant.id, participant.hikeId, { action: 'payment', actor: adminActor(session), amount: Number(review.amount) })
  if (!participant.matchedTransaction) {
    await prisma.processedBankTransaction.create({
      data: { transactionId: review.transactionId, hikeParticipantId: participant.id, amount: review.amount },
    })
  }
  await prisma.bankTransactionReview.update({
    where: { id: reviewId },
    data: { status: 'resolved', hikeParticipantId: participant.id, resolvedAt: new Date() },
  })

  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
  revalidateLocalePaths('/admin', revalidatePath)
}

// Not a hike payment (or already handled by hand) — hide it for good.
export async function dismissBankTransaction(reviewId: string) {
  await requireAdmin()
  await prisma.bankTransactionReview.update({
    where: { id: reviewId },
    data: { status: 'dismissed', resolvedAt: new Date() },
  })
  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
  revalidateLocalePaths('/admin', revalidatePath)
}
