import { prisma } from '@/lib/db'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import BankAccountsClient from './client'
import RevolutConnection from '@/components/admin/RevolutConnection'
import PaymentReviewList from '@/components/admin/PaymentReviewList'
import { findPaymentCandidates, getPaymentCandidatePool } from '@/lib/revolutSync'
import { friendCoveredByPayment } from '@/lib/participantPairs'

export default async function BankAccountsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [d, accounts, connection, openReviews, pool] = await Promise.all([
    getDictionary(lang),
    prisma.bankAccount.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.bankConnection.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.bankTransactionReview.findMany({ where: { status: 'open' }, orderBy: { createdAt: 'desc' } }),
    getPaymentCandidatePool(),
  ])

  // Suggestions are recomputed on every visit so they reflect current registrations.
  const reviews = openReviews.map(r => {
    const payment = { amount: Number(r.amount), description: r.description, senderName: r.senderName }
    return {
      id: r.id,
      ...payment,
      bookedAt: (r.bookedAt ?? r.createdAt).toISOString(),
      candidates: findPaymentCandidates(payment, pool).slice(0, 5).map(c => ({
        participantId: c.participant.id,
        name: c.participant.user?.name ?? '?',
        hikeTitle: c.participant.hike.title,
        hikeDate: c.participant.hike.date.toISOString(),
        status: c.participant.status as 'pending' | 'waitlist',
        expectedAmount: c.expectedAmount,
        withFriend: friendCoveredByPayment(c.participant.friend),
        amountMatches: c.amountMatches,
        nameMatches: c.nameMatches,
        namePartlyMatches: c.namePartlyMatches,
      })),
    }
  })
  const reviewOptions = pool
    .map(p => ({ participantId: p.id, label: `${p.user?.name ?? '?'} — ${p.hike.title}` }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const serialized = accounts.map(a => ({ ...a, createdAt: a.createdAt.toISOString() }))
  const serializedConnection = connection && connection.status !== 'pending' ? {
    status: connection.status,
    institutionName: connection.institutionName,
    linkedAt: connection.linkedAt ? connection.linkedAt.toISOString() : null,
    consentExpiresAt: connection.consentExpiresAt ? connection.consentExpiresAt.toISOString() : null,
    lastSyncedAt: connection.lastSyncedAt ? connection.lastSyncedAt.toISOString() : null,
    lastMatchedCount: connection.lastMatchedCount,
    lastUnmatchedCount: connection.lastUnmatchedCount,
  } : null

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 pt-10">
        <RevolutConnection connection={serializedConnection} dict={d.admin.revolutConnection} locale={lang} />
      </div>
      {reviews.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <PaymentReviewList reviews={reviews} options={reviewOptions} dict={d.admin.paymentReview} locale={lang} />
        </div>
      )}
      <BankAccountsClient initialAccounts={serialized} dict={d.admin.bankAccounts} />
    </>
  )
}
