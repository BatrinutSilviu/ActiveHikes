import Link from 'next/link'
import { prisma } from '@/lib/db'
import HikeCard from '@/components/HikeCard'
import { Mountain, ArrowRight } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'

async function getUpcomingHikes() {
  const hikes = await prisma.hike.findMany({
    where: { status: { in: ['upcoming', 'ongoing'] } },
    orderBy: { date: 'asc' },
    take: 6,
    include: { participants: { select: { status: true } } },
  })
  return hikes.map(h => ({
    ...h,
    date: h.date.toISOString(),
    endDate: h.endDate ? h.endDate.toISOString() : null,
    entryFee: Number(h.entryFee),
    durationHours: h.durationHours ? Number(h.durationHours) : null,
    accommodationPrice: h.accommodationPrice ? Number(h.accommodationPrice) : null,
    accommodationDeposit: h.accommodationDeposit ? Number(h.accommodationDeposit) : null,
    confirmedCount: h.participants.filter(p => p.status === 'confirmed').length,
    waitlistCount: h.participants.filter(p => p.status === 'waitlist').length,
    participants: undefined,
  }))
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [d, upcomingHikes] = await Promise.all([getDictionary(lang), getUpcomingHikes()])

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center justify-center bg-stone-950 text-white overflow-hidden px-4 py-20">
        {/* Background texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_80%,rgba(6,78,59,0.2),transparent)]" />

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Label */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-4 py-2 rounded-full mb-8 tracking-widest uppercase">
            <Mountain size={12} /> {lang === 'ro' ? 'Comunitate de drumeție' : 'Hiking community'}
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            {d.home.heroTitle}
          </h1>

          <p className="text-lg sm:text-xl text-stone-400 mb-12 max-w-xl mx-auto leading-relaxed">
            {d.home.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/${lang}/hikes`}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-2xl font-bold text-base shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2">
              {d.home.seeAllHikes} <ArrowRight size={18} />
            </Link>
            <Link href={`/${lang}/auth/signup`}
              className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-semibold text-base hover:bg-white/10 transition-all backdrop-blur-sm">
              {d.home.createAccount}
            </Link>
          </div>

        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f7f6f3] to-transparent" />
      </section>

      {/* Upcoming hikes */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-emerald-600 text-sm font-semibold uppercase tracking-widest mb-2">{lang === 'ro' ? 'Planificate' : 'Scheduled'}</p>
            <h2 className="text-4xl font-black tracking-tight text-stone-900">{d.home.upcomingTitle}</h2>
          </div>
          <Link href={`/${lang}/hikes`}
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-emerald-600 transition-colors group">
            {d.home.viewAll}
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {upcomingHikes.length === 0 ? (
          <div className="text-center py-24 text-stone-400">
            <Mountain size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">{d.home.noHikes}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingHikes.map(hike => <HikeCard key={hike.id} hike={hike as any} lang={lang} dict={d.hikeCard} />)}
          </div>
        )}

        <div className="sm:hidden mt-8 text-center">
          <Link href={`/${lang}/hikes`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            {d.home.viewAll} <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  )
}
