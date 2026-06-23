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
    entryFee: Number(h.entryFee),
    durationHours: h.durationHours ? Number(h.durationHours) : null,
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
      <section className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-stone-800 text-white py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-emerald-300 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Mountain size={56} className="text-emerald-300" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 tracking-tight whitespace-pre-line">{d.home.heroTitle}</h1>
          <p className="text-base sm:text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">{d.home.heroSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/${lang}/hikes`} className="bg-white text-emerald-800 px-8 py-3 rounded-xl font-semibold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
              {d.home.seeAllHikes} <ArrowRight size={18} />
            </Link>
            <Link href={`/${lang}/auth/signup`} className="border-2 border-white/40 text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors">
              {d.home.createAccount}
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-stone-900">{d.home.upcomingTitle}</h2>
            <p className="text-stone-500 mt-1">{d.home.upcomingSubtitle}</p>
          </div>
          <Link href={`/${lang}/hikes`} className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            {d.home.viewAll} <ArrowRight size={16} />
          </Link>
        </div>

        {upcomingHikes.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <Mountain size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">{d.home.noHikes}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingHikes.map(hike => <HikeCard key={hike.id} hike={hike as any} lang={lang} dict={d.hikeCard} />)}
          </div>
        )}
      </section>
    </div>
  )
}
