import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RoomPicker from '@/components/hikes/RoomPicker'
import { ArrowLeft, UserCheck } from 'lucide-react'
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
          include: {
            occupants: {
              select: { id: true, guestName: true, user: { select: { name: true } } },
            },
          },
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
    occupants: r.occupants,
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
          <div className="space-y-2 mb-6">
            {rooms.map(room => (
              <div key={room.id} className="bg-white border border-stone-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-stone-800">
                    {roomTypeLabels[room.type] ?? room.type} {room.label}
                  </span>
                  <span className="text-xs font-medium text-stone-400">{room.occupied}/{room.capacity}</span>
                </div>
                {room.occupants.length === 0 ? (
                  <p className="text-stone-400 text-sm">{dd.roomEmpty}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {room.occupants.map(o => (
                      <span key={o.id} className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                        <UserCheck size={11} />
                        {o.user.name ?? '?'}{o.guestName && ` +${o.guestName}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
