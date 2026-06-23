import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mountain, Calendar, CheckCircle, Clock, List } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'

export default async function ProfilePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [session, d] = await Promise.all([getServerSession(authOptions), getDictionary(lang)])
  if (!session) redirect(`/${lang}/auth/login`)

  const [user, participations] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.hikeParticipant.findMany({
      where: { userId: session.user.id },
      orderBy: { joinedAt: 'desc' },
      include: { hike: { select: { id: true, title: true, destination: true, date: true, status: true, coverImageUrl: true } } },
    }),
  ])

  const upcoming = participations.filter(p => p.hike && ['upcoming', 'ongoing'].includes(p.hike.status) && p.status !== 'rejected')
  const past = participations.filter(p => p.hike && ['completed', 'cancelled'].includes(p.hike.status))

  const dp = d.profile
  const statusLabels = dp.participationStatus as Record<string, string>

  const STATUS_UI: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    confirmed: { label: statusLabels.confirmed, icon: <CheckCircle size={14} />, color: 'text-emerald-600' },
    pending: { label: statusLabels.pending, icon: <Clock size={14} />, color: 'text-yellow-600' },
    waitlist: { label: statusLabels.waitlist, icon: <List size={14} />, color: 'text-blue-600' },
    rejected: { label: statusLabels.rejected, icon: null, color: 'text-red-500' },
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white border border-stone-100 rounded-2xl p-6 mb-8 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-2xl font-bold">
          {user?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{user?.name}</h1>
          <p className="text-stone-400">{user?.email}</p>
          {user?.phone && <p className="text-stone-400 text-sm">{user.phone}</p>}
          {session.user.role === 'admin' && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {dp.adminBadge}
            </span>
          )}
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-stone-800 mb-4">{dp.upcomingHikes}</h2>
        {upcoming.length === 0 ? (
          <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center text-stone-400">
            <Mountain size={36} className="mx-auto mb-3 opacity-30" />
            <p>{dp.noUpcoming}</p>
            <Link href={`/${lang}/hikes`} className="mt-3 inline-block text-emerald-600 font-medium hover:underline">{dp.browseHikes}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(p => <ParticipationCard key={p.id} participation={p} lang={lang} statusUI={STATUS_UI} dateLocale={d.locale} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-stone-800 mb-4">{dp.pastHikes}</h2>
          <div className="space-y-3">
            {past.map(p => <ParticipationCard key={p.id} participation={p} lang={lang} statusUI={STATUS_UI} dateLocale={d.locale} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function ParticipationCard({ participation, lang, statusUI, dateLocale }: {
  participation: any
  lang: string
  statusUI: Record<string, { label: string; icon: React.ReactNode; color: string }>
  dateLocale: string
}) {
  const hike = participation.hike
  const ui = statusUI[participation.status]
  return (
    <Link href={`/${lang}/hikes/${hike.id}`}
      className="flex items-center gap-4 bg-white border border-stone-100 rounded-xl p-4 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-emerald-800 shrink-0">
        {hike.coverImageUrl ? (
          <img src={hike.coverImageUrl} alt={hike.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Mountain size={20} className="text-white/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-stone-800 truncate">{hike.title}</div>
        <div className="text-stone-400 text-sm flex items-center gap-1">
          <Calendar size={12} />
          {new Date(hike.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium ${ui.color}`}>
        {ui.icon} {ui.label}
      </div>
    </Link>
  )
}
