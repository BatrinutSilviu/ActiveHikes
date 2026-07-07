import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RoomConfigForm from '@/components/admin/RoomConfigForm'
import { ArrowLeft, BedDouble, UserCheck } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'

export default async function AdminHikeRoomsPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  const [d, hike] = await Promise.all([
    getDictionary(lang),
    prisma.hike.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        doubleRoomCount: true,
        tripleRoomCount: true,
        quadrupleRoomCount: true,
        rooms: {
          orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
          include: {
            occupants: {
              select: { id: true, guestName: true, user: { select: { name: true } } },
            },
          },
        },
        participants: {
          where: { roomId: null, status: { in: ['confirmed', 'pending', 'waitlist'] } },
          select: { id: true, guestName: true, user: { select: { name: true } } },
        },
      },
    }),
  ])

  if (!hike) notFound()

  const dr = d.admin.roomsPage
  const roomTypeLabels = d.hikeDetail.roomTypes as Record<string, string>

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href={`/${lang}/admin/hikes/${hike.id}`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {dr.backToHike}
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">{dr.title}</h1>
        <p className="text-stone-500 mt-1">{hike.title}</p>
      </div>

      <div className="space-y-6">
        <RoomConfigForm
          hikeId={hike.id}
          doubleRoomCount={hike.doubleRoomCount}
          tripleRoomCount={hike.tripleRoomCount}
          quadrupleRoomCount={hike.quadrupleRoomCount}
          dict={dr}
        />

        <div>
          <h2 className="text-lg font-bold text-stone-800 mb-3 flex items-center gap-2">
            <BedDouble size={18} className="text-blue-600" /> {dr.occupantsTitle}
          </h2>

          {hike.rooms.length === 0 ? (
            <div className="text-center py-10 text-stone-400 bg-white rounded-2xl border border-stone-100">{dr.noRooms}</div>
          ) : (
            <div className="space-y-2">
              {hike.rooms.map(room => (
                <div key={room.id} className="bg-white border border-stone-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-stone-800">
                      {roomTypeLabels[room.type] ?? room.type} {room.label}
                    </span>
                    <span className="text-xs font-medium text-stone-400">
                      {room.occupants.length}/{room.capacity}
                    </span>
                  </div>
                  {room.occupants.length === 0 ? (
                    <p className="text-stone-400 text-sm">{dr.empty}</p>
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
          )}
        </div>

        {hike.participants.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">{dr.unassignedTitle}</h3>
            <div className="flex flex-wrap gap-1.5">
              {hike.participants.map(p => (
                <span key={p.id} className="text-xs bg-stone-50 border border-stone-200 text-stone-700 px-2.5 py-1 rounded-full">
                  {p.user.name ?? '?'}{p.guestName && ` +${p.guestName}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
