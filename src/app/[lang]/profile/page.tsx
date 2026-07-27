import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mountain, Calendar, CheckCircle, Clock, List, ShieldCheck, Phone, Mail, XCircle } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import NameEditor from '@/components/profile/NameEditor'
import { expireOverduePending } from '@/lib/expireParticipants'
import { formatHikeDate } from '@/lib/dates'

export default async function ProfilePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [session, d] = await Promise.all([getServerSession(authOptions), getDictionary(lang)])
  if (!session) redirect(`/${lang}/auth/login`)

  await expireOverduePending()

  const [user, participations] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.hikeParticipant.findMany({
      where: { userId: session.user.id },
      orderBy: { joinedAt: 'desc' },
      include: { hike: { select: { id: true, title: true, destination: true, date: true, endDate: true, status: true, coverImageUrl: true } } },
    }),
  ])

  const upcoming = participations.filter(p => p.hike && ['upcoming', 'ongoing'].includes(p.hike.status) && p.status !== 'rejected')
  const past = participations.filter(p => p.hike && ['completed', 'cancelled'].includes(p.hike.status) && p.status === 'confirmed')

  const dp = d.profile
  const statusLabels = dp.participationStatus as Record<string, string>

  const STATUS_UI: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    confirmed: { label: statusLabels.confirmed, icon: <CheckCircle size={13} />, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    pending: { label: statusLabels.pending, icon: <Clock size={13} />, color: 'text-amber-700', bg: 'bg-amber-50' },
    waitlist: { label: statusLabels.waitlist, icon: <List size={13} />, color: 'text-blue-700', bg: 'bg-blue-50' },
    rejected: { label: statusLabels.rejected, icon: null, color: 'text-red-600', bg: 'bg-red-50' },
    expired: { label: statusLabels.expired, icon: <XCircle size={13} />, color: 'text-stone-500', bg: 'bg-stone-100' },
  }

  const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  return (
    <div>
      {/* Dark profile header */}
      <div className="relative bg-stone-950 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
        <div className="relative max-w-3xl mx-auto px-4 py-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-emerald-900/40 shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <NameEditor fullName={user?.name ?? ''} labels={dp.nameEditor} />
                {session.user.role === 'admin' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    <ShieldCheck size={11} /> {dp.adminBadge}
                  </span>
                )}
              </div>
              <div className="mt-1.5 space-y-1">
                <p className="text-stone-400 text-sm flex items-center gap-2">
                  <Mail size={13} className="text-stone-500" /> {user?.email}
                </p>
                {user?.phone && (
                  <p className="text-stone-400 text-sm flex items-center gap-2">
                    <Phone size={13} className="text-stone-500" /> {user.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Upcoming hikes */}
      <section className="mb-8">
        <h2 className="text-xl font-black tracking-tight text-stone-900 mb-4">{dp.upcomingHikes}</h2>
        {upcoming.length === 0 ? (
          <div className="bg-white border border-stone-100 rounded-2xl p-10 text-center text-stone-400">
            <Mountain size={36} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">{dp.noUpcoming}</p>
            <Link href={`/${lang}/hikes`} className="mt-3 inline-block text-emerald-600 font-semibold text-sm hover:underline">{dp.browseHikes}</Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcoming.map(p => <ParticipationCard key={p.id} participation={p} lang={lang} statusUI={STATUS_UI} dateLocale={d.locale} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-xl font-black tracking-tight text-stone-900 mb-4">{dp.pastHikes}</h2>
          <div className="space-y-2.5">
            {past.map(p => <ParticipationCard key={p.id} participation={p} lang={lang} statusUI={STATUS_UI} dateLocale={d.locale} />)}
          </div>
        </section>
      )}
    </div>
    </div>
  )
}

function ParticipationCard({ participation, lang, statusUI, dateLocale }: {
  participation: any
  lang: string
  statusUI: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }>
  dateLocale: string
}) {
  const hike = participation.hike
  const ui = statusUI[participation.status]
  return (
    <Link href={`/${lang}/hikes/${hike.id}`}
      className="flex items-center gap-4 bg-white border border-stone-100 rounded-2xl p-4 hover:border-emerald-200 hover:shadow-sm transition-all group">
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-800 to-stone-700 shrink-0">
        {hike.coverImageUrl ? (
          <img src={hike.coverImageUrl} alt={hike.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Mountain size={20} className="text-white/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-stone-800 truncate group-hover:text-emerald-700 transition-colors">{hike.title}</div>
        <div className="text-stone-400 text-sm flex items-center gap-1 mt-0.5">
          <Calendar size={12} />
          {formatHikeDate(hike.date, hike.endDate, dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full ${ui.color} ${ui.bg} shrink-0`}>
        {ui.icon} {ui.label}
      </div>
    </Link>
  )
}
