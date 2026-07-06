import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Plus, Users, Mountain, CreditCard, ChevronRight, TrendingUp } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { expireOverduePending } from '@/lib/expireParticipants'

export default async function AdminDashboard({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  await expireOverduePending()

  const [d, hikeCount, pendingCount, userCount, upcomingHikes, pastHikes] = await Promise.all([
    getDictionary(lang),
    prisma.hike.count(),
    prisma.hikeParticipant.count({ where: { status: 'pending' } }),
    prisma.user.count({ where: { role: 'user' } }),
    prisma.hike.findMany({
      where: { status: { in: ['upcoming', 'ongoing'] } },
      orderBy: { date: 'asc' },
      take: 5,
      select: { id: true, title: true, date: true, maxParticipants: true },
    }),
    prisma.hike.findMany({
      where: { status: { in: ['completed', 'cancelled'] } },
      orderBy: { date: 'desc' },
      select: { id: true, title: true, date: true, status: true },
    }),
  ])

  const da = d.admin.dashboard

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <p className="text-emerald-600 text-xs font-semibold uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">{da.title}</h1>
          <p className="text-stone-500 mt-1 text-sm">{da.subtitle}</p>
        </div>
        <Link href={`/${lang}/admin/hikes/new`}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-emerald-200 hover:shadow-md">
          <Plus size={17} /> {da.newHike}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Mountain size={20} className="text-white" />
            </div>
            <TrendingUp size={16} className="text-emerald-200" />
          </div>
          <div className="text-4xl font-black">{hikeCount}</div>
          <div className="text-emerald-100 text-sm font-medium mt-1">{da.totalHikes}</div>
        </div>

        <div className={`rounded-2xl p-6 shadow-sm border ${pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pendingCount > 0 ? 'bg-amber-100' : 'bg-stone-100'}`}>
              <Users size={20} className={pendingCount > 0 ? 'text-amber-600' : 'text-stone-500'} />
            </div>
            {pendingCount > 0 && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                {lang === 'ro' ? 'Necesită atenție' : 'Needs attention'}
              </span>
            )}
          </div>
          <div className={`text-4xl font-black ${pendingCount > 0 ? 'text-amber-600' : 'text-stone-900'}`}>{pendingCount}</div>
          <div className="text-stone-500 text-sm font-medium mt-1">{da.pendingConfirmations}</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
              <Users size={20} className="text-stone-600" />
            </div>
          </div>
          <div className="text-4xl font-black text-stone-900">{userCount}</div>
          <div className="text-stone-500 text-sm font-medium mt-1">{da.registeredUsers}</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <QuickLink href={`/${lang}/admin/hikes/new`} icon={<Plus size={17} />} label={da.createHike} />
        <QuickLink href={`/${lang}/admin/bank-accounts`} icon={<CreditCard size={17} />} label={da.bankAccounts} />
        <QuickLink href={`/${lang}/admin/participants`} icon={<Users size={17} />} label={da.allParticipants} />
      </div>

      {/* Upcoming hikes list */}
      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-bold text-stone-900">{da.upcomingHikes}</h2>
          <Link href={`/${lang}/admin/hikes/new`} className="text-emerald-600 text-sm font-semibold hover:text-emerald-700 transition-colors">{da.addNew}</Link>
        </div>
        {upcomingHikes.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone-400">
            <Mountain size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{da.noUpcoming}</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {upcomingHikes.map(hike => (
              <Link key={hike.id} href={`/${lang}/admin/hikes/${hike.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors group">
                <div>
                  <div className="font-semibold text-stone-800 group-hover:text-emerald-700 transition-colors">{hike.title}</div>
                  <div className="text-stone-400 text-xs mt-0.5">
                    {hike.date.toLocaleDateString(d.locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{hike.maxParticipants} {da.spots}
                  </div>
                </div>
                <ChevronRight size={17} className="text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Past hikes list */}
      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-900">{da.pastHikes}</h2>
        </div>
        {pastHikes.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone-400">
            <Mountain size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{da.noPast}</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {pastHikes.map(hike => (
              <Link key={hike.id} href={`/${lang}/admin/hikes/${hike.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors group">
                <div>
                  <div className="font-semibold text-stone-700 group-hover:text-emerald-700 transition-colors">{hike.title}</div>
                  <div className="text-stone-400 text-xs mt-0.5">
                    {hike.date.toLocaleDateString(d.locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    <span className={hike.status === 'completed' ? 'text-emerald-600' : 'text-red-400'}>
                      {hike.status}
                    </span>
                  </div>
                </div>
                <ChevronRight size={17} className="text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}
      className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl p-4 hover:border-emerald-200 hover:bg-emerald-50 transition-all group shadow-sm">
      <span className="text-emerald-600 w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors shrink-0">{icon}</span>
      <span className="font-medium text-stone-700 text-sm">{label}</span>
      <ChevronRight size={15} className="text-stone-300 ml-auto group-hover:text-emerald-400 transition-colors" />
    </Link>
  )
}
