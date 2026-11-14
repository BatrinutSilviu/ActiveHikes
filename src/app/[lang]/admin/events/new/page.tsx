import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/db'
import { getAdminSession } from '@/lib/session'
import { getDictionary, hasLocale } from '@/lib/i18n'
import EventForm from '@/components/generalEvents/EventForm'
import { eventCategories } from '@/lib/eventCategories'

export default async function NewGeneralEventPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  if (!(await getAdminSession())) redirect(`/${lang}/auth/login`)

  const [d, bankAccounts] = await Promise.all([
    getDictionary(lang),
    prisma.bankAccount.findMany({ where: { isActive: true }, select: { id: true, type: true, bankName: true, accountHolder: true } }),
  ])
  const da = d.events.admin

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/${lang}/admin`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {d.admin.viaFerrata.backToDashboard}
      </Link>
      <h1 className="text-3xl font-black tracking-tight text-stone-900">{da.createTitle}</h1>
      <p className="text-stone-500 mt-1 mb-6 text-sm">{da.createSubtitle}</p>
      <EventForm bankAccounts={bankAccounts} {...await eventCategories()} lang={lang} dict={da.form} />
    </div>
  )
}
