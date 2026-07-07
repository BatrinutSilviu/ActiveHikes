import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { expireOverduePending } from '@/lib/expireParticipants'
import { formatHikeDate } from '@/lib/dates'

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  waitlist: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-600',
  expired: 'bg-stone-200 text-stone-500',
}

export default async function AllParticipantsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  await expireOverduePending()

  const [d, participants] = await Promise.all([
    getDictionary(lang),
    prisma.hikeParticipant.findMany({
      orderBy: { joinedAt: 'desc' },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        hike: { select: { id: true, title: true, date: true, endDate: true } },
      },
    }),
  ])

  const dp = d.admin.participants
  const pending = participants.filter(p => p.status === 'pending')
  const others = participants.filter(p => p.status !== 'pending')

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-stone-900 mb-8">{dp.title}</h1>

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-amber-700 mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            {dp.pendingSection} ({pending.length})
          </h2>
          <ParticipantTable participants={pending} lang={lang} dateLocale={d.locale} none={dp.none} />
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-stone-700 mb-3">{dp.othersSection}</h2>
        <ParticipantTable participants={others} lang={lang} dateLocale={d.locale} none={dp.none} />
      </section>
    </div>
  )
}

function ParticipantTable({ participants, lang, dateLocale, none }: { participants: any[]; lang: string; dateLocale: string; none: string }) {
  if (participants.length === 0) return <p className="text-stone-400">{none}</p>
  return (
    <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden divide-y divide-stone-50">
      {participants.map((p: any) => (
        <Link key={p.id} href={`/${lang}/admin/hikes/${p.hike.id}`}
          className="px-5 py-3 flex items-center gap-3 hover:bg-stone-50 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-stone-800">{p.user.name}</div>
            <div className="text-stone-400 text-xs">{p.user.email}</div>
            <div className="text-stone-500 text-sm mt-0.5 truncate">{p.hike.title}</div>
            <div className="text-stone-400 text-xs">{formatHikeDate(p.hike.date, p.hike.endDate, dateLocale, {})}</div>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize shrink-0 ${STATUS_BADGE[p.status]}`}>{p.status}</span>
          <ChevronRight size={16} className="text-stone-300 shrink-0" />
        </Link>
      ))}
    </div>
  )
}
