import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CarConfigForm from '@/components/admin/CarConfigForm'
import CarAllocatorPanel from '@/components/admin/CarAllocatorPanel'
import { ArrowLeft } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'

export default async function AdminHikeCarsPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  const [d, hike] = await Promise.all([
    getDictionary(lang),
    prisma.hike.findUnique({
      where: { id },
      select: { id: true, title: true, peoplePerCar: true, carsNeeded: true, maxParticipants: true, status: true },
    }),
  ])

  if (!hike) notFound()

  const dc = d.admin.carsPage

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href={`/${lang}/admin/hikes/${hike.id}`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {dc.backToHike}
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">{dc.title}</h1>
        <p className="text-stone-500 mt-1">{hike.title}</p>
      </div>

      <div className="space-y-6">
        <CarConfigForm
          hikeId={hike.id}
          peoplePerCar={hike.peoplePerCar}
          carsNeeded={hike.carsNeeded}
          maxParticipants={hike.maxParticipants}
          dict={dc}
        />

        {hike.status === 'upcoming' && (
          <CarAllocatorPanel hikeId={hike.id} dict={d.admin.hike.carAllocator} />
        )}
      </div>
    </div>
  )
}
