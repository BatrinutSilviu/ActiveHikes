import { prisma } from '@/lib/db'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import BankAccountsClient from './client'

export default async function BankAccountsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [d, accounts] = await Promise.all([
    getDictionary(lang),
    prisma.bankAccount.findMany({ orderBy: { createdAt: 'asc' } }),
  ])

  const serialized = accounts.map(a => ({ ...a, createdAt: a.createdAt.toISOString() }))
  return <BankAccountsClient initialAccounts={serialized} dict={d.admin.bankAccounts} />
}
