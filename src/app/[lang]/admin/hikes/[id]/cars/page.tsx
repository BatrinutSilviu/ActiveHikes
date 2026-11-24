import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CarConfigForm from '@/components/admin/CarConfigForm'
import CarAllocatorPanel from '@/components/admin/CarAllocatorPanel'
import ManualCarAssignmentList from '@/components/admin/ManualCarAssignmentList'
import GasCostsCalculator from '@/components/admin/GasCostsCalculator'
import { parseGasCosts } from '@/lib/gasCosts'
import { ArrowLeft, Users, Download } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { EVENT_PATH } from '@/lib/eventPaths'

export default async function AdminHikeCarsPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  const [d, hike] = await Promise.all([
    getDictionary(lang),
    prisma.hike.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        title: true,
        peoplePerCar: true,
        carsNeeded: true,
        maxParticipants: true,
        gasCosts: true,
        participants: {
          where: { status: 'confirmed' },
          select: {
            id: true,
            friendName: true,
            hostParticipantId: true,
            bringsCar: true,
            carSeats: true,
            carTrip: true,
            carDriverParticipantId: true,
            gasPaidAt: true,
            gasExempt: true,
            driverLocked: true,
            user: { select: { name: true } },
            friend: { select: { id: true, friendName: true } },
            host: { select: { user: { select: { name: true } } } },
          },
        },
      },
    }),
  ])

  if (!hike) notFound()

  const dc = d.admin.carsPage
  const basePath = EVENT_PATH[hike.type]
  const pName = (p: { user: { name: string | null } | null; friendName: string | null }) => p.user?.name ?? p.friendName ?? '?'
  const drivers = hike.participants
    .filter(p => p.bringsCar && p.carSeats != null)
    .map(p => ({ id: p.id, name: pName(p), seats: p.carSeats!, carTrip: p.carTrip }))
  const people = hike.participants.map(p => ({ id: p.id, name: pName(p) })).sort((a, b) => a.name.localeCompare(b.name, 'ro'))

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href={`/${lang}/admin/${basePath}/${hike.id}`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {dc.backToHike}
      </Link>

      <div className="flex items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{dc.title}</h1>
          <p className="text-stone-500 mt-1">{hike.title}</p>
        </div>
        <Link href={`/${lang}/${basePath}/${hike.id}/carpool`} className="text-emerald-600 hover:underline text-sm font-medium shrink-0" target="_blank">
          {dc.viewCarpoolPage}
        </Link>
      </div>

      <div className="space-y-6">
        <CarConfigForm
          hikeId={hike.id}
          peoplePerCar={hike.peoplePerCar}
          carsNeeded={hike.carsNeeded}
          maxParticipants={hike.maxParticipants}
          dict={dc}
        />

        <CarAllocatorPanel hikeId={hike.id} dict={d.admin.hike.carAllocator} tripDict={d.carTrip} />

        {drivers.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <Users size={18} className="text-emerald-600" /> {dc.assignTitle}
              </h2>
              <a
                href={`/api/hikes/${hike.id}/cars/export`}
                className="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors shrink-0"
              >
                <Download size={14} /> {dc.exportCsv}
              </a>
            </div>
            <ManualCarAssignmentList
              hikeId={hike.id}
              participants={hike.participants.map(p => ({
                id: p.id,
                friendName: p.friendName,
                hostParticipantId: p.hostParticipantId,
                hostName: p.host?.user?.name ?? null,
                linkedFriend: p.friend ? { id: p.friend.id, name: p.friend.friendName } : null,
                bringsCar: p.bringsCar,
                carTrip: p.carTrip,
                carDriverParticipantId: p.carDriverParticipantId,
                gasPaid: p.gasPaidAt !== null,
                gasExempt: p.gasExempt,
                driverLocked: p.driverLocked,
                user: p.user,
              }))}
              drivers={drivers}
              dict={dc}
              tripDict={d.carTrip}
            />
          </div>
        )}

        <GasCostsCalculator
          hikeId={hike.id}
          saved={parseGasCosts(hike.gasCosts)}
          hikeDrivers={hike.participants.filter(p => p.bringsCar).map(p => ({ id: p.id, name: pName(p) }))}
          participants={people}
          confirmedCount={hike.participants.filter(p => !p.gasExempt).length}
          dict={d.admin.gasCosts}
        />
      </div>
    </div>
  )
}
