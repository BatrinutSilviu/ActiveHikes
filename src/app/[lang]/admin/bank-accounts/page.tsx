import { prisma } from '@/lib/db'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import BankAccountsClient from './client'
import RevolutConnection from '@/components/admin/RevolutConnection'

export default async function BankAccountsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [d, accounts, connection] = await Promise.all([
    getDictionary(lang),
    prisma.bankAccount.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.bankConnection.findFirst({ orderBy: { createdAt: 'desc' } }),
  ])

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
      <BankAccountsClient initialAccounts={serialized} dict={d.admin.bankAccounts} />
    </>
  )
}
