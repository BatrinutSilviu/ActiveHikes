import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Plus, Users, Mountain, CreditCard, ChevronRight } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'

export default async function AdminDashboard({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [d, hikeCount, pendingCount, userCount, upcomingHikes] = await Promise.all([
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
  ])

  const da = d.admin.dashboard

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{da.title}</h1>
          <p className="text-stone-500 mt-1">{da.subtitle}</p>
        </div>
        <Link href={`/${lang}/admin/hikes/new`}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
          <Plus size={18} /> {da.newHike}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard icon={<Mountain size={20} />} label={da.totalHikes} value={hikeCount} color="emerald" />
        <StatCard icon={<Users size={20} />} label={da.pendingConfirmations} value={pendingCount} color="amber" urgent={pendingCount > 0} />
        <StatCard icon={<Users size={20} />} label={da.registeredUsers} value={userCount} color="stone" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <QuickLink href={`/${lang}/admin/hikes/new`} icon={<Plus size={18} />} label={da.createHike} />
        <QuickLink href={`/${lang}/admin/bank-accounts`} icon={<CreditCard size={18} />} label={da.bankAccounts} />
        <QuickLink href={`/${lang}/admin/participants`} icon={<Users size={18} />} label={da.allParticipants} />
      </div>

      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-bold text-stone-800">{da.upcomingHikes}</h2>
          <Link href={`/${lang}/admin/hikes/new`} className="text-emerald-600 text-sm font-medium hover:underline">{da.addNew}</Link>
        </div>
        {upcomingHikes.length === 0 ? (
          <div className="px-6 py-10 text-center text-stone-400">{da.noUpcoming}</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {upcomingHikes.map(hike => (
              <Link key={hike.id} href={`/${lang}/admin/hikes/${hike.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors">
                <div>
                  <div className="font-semibold text-stone-800">{hike.title}</div>
                  <div className="text-stone-400 text-sm">
                    {hike.date.toLocaleDateString(d.locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{hike.maxParticipants} {da.spots}
                  </div>
                </div>
                <ChevronRight size={18} className="text-stone-300" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, urgent }: { icon: React.ReactNode; label: string; value: number; color: string; urgent?: boolean }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    stone: 'text-stone-600 bg-stone-100',
  }
  return (
    <div className={`bg-white border ${urgent ? 'border-amber-200' : 'border-stone-100'} rounded-2xl p-5`}>
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>{icon}</div>
      <div className={`text-3xl font-bold ${urgent ? 'text-amber-600' : 'text-stone-900'}`}>{value}</div>
      <div className="text-stone-500 text-sm mt-0.5">{label}</div>
    </div>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl p-4 hover:border-emerald-200 hover:bg-emerald-50 transition-colors">
      <span className="text-emerald-600">{icon}</span>
      <span className="font-medium text-stone-700">{label}</span>
      <ChevronRight size={16} className="text-stone-300 ml-auto" />
    </Link>
  )
}
