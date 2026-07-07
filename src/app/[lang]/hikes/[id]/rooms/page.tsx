import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RoomPicker from '@/components/hikes/RoomPicker'
import { ArrowLeft } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'

export default async function HikeRoomsPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  const [d, session, hike] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    prisma.hike.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        rooms: {
          orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
          include: { occupants: { select: { id: true } } },
        },
      },
    }),
  ])

  if (!hike) notFound()

  const rooms = hike.rooms.map(r => ({
    id: r.id,
    type: r.type,
    label: r.label,
    capacity: r.capacity,
    occupied: r.occupants.length,
  }))

  let userParticipation = null
  if (session?.user?.id) {
    userParticipation = await prisma.hikeParticipant.findUnique({
      where: { hikeId_userId: { hikeId: id, userId: session.user.id } },
      select: { status: true, roomId: true },
    })
  }

  const dd = d.hikeDetail
  const roomTypeLabels = dd.roomTypes as Record<string, string>

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/${lang}/hikes/${hike.id}`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {hike.title}
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 mb-4">{dd.roomsTitle}</h1>

      {rooms.length === 0 ? (
        <p className="text-stone-400">{d.admin.roomsPage.noRooms}</p>
      ) : (
        <>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse bg-white border border-stone-100 rounded-xl overflow-hidden">
              <thead>
                <tr className="text-left bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                  <th className="py-2.5 px-4 font-semibold">{dd.roomColumn}</th>
                  <th className="py-2.5 px-4 font-semibold">{dd.roomCapacityColumn}</th>
                  <th className="py-2.5 px-4 font-semibold">{dd.roomOccupancyColumn}</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.id} className="border-t border-stone-100">
                    <td className="py-2.5 px-4 text-stone-800 font-medium">
                      {roomTypeLabels[room.type] ?? room.type} {room.label}
                    </td>
                    <td className="py-2.5 px-4 text-stone-600">{room.capacity}</td>
                    <td className="py-2.5 px-4 text-stone-600">{room.occupied}/{room.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {userParticipation && userParticipation.status !== 'rejected' && (
            <RoomPicker
              hikeId={hike.id}
              rooms={rooms}
              currentRoomId={userParticipation.roomId}
              dict={d.roomPicker}
            />
          )}
        </>
      )}
    </div>
  )
}
