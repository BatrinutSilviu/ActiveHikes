import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { ArrowLeft } from 'lucide-react'
import type { HikeType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import AttendeeSection from '@/components/hikes/AttendeeSection'
import { getDictionary, type Locale } from '@/lib/i18n'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'
import { EVENT_PATH } from '@/lib/eventPaths'

/** The participants & carpool page of a hike or Via Ferrata event (/…/[id]/carpool). */
export default async function EventCarpoolPage({ lang, id, type }: { lang: Locale; id: string; type: HikeType }) {
  await advanceEventStatuses()
  const [d, session, event] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    prisma.hike.findFirst({
      where: { id, type },
      select: {
        id: true,
        title: true,
        status: true,
        participants: {
          select: { id: true, userId: true, status: true, friendName: true, hostParticipantId: true, bringsCar: true, carSeats: true, carTrip: true, carDriverParticipantId: true, user: { select: { name: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    }),
  ])

  if (!event) notFound()
  if (event.status === 'draft' && session?.user?.role !== 'admin') notFound()

  const dd = d.hikeDetail
  const userParticipation = session?.user?.id
    ? event.participants.find(p => p.userId === session.user.id) ?? null
    : null
  const friendParticipation = userParticipation
    ? event.participants.find(p => p.hostParticipantId === userParticipation.id) ?? null
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/${lang}/${EVENT_PATH[type]}/${event.id}`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {event.title}
      </Link>

      <AttendeeSection
        hikeId={event.id}
        participants={event.participants}
        userParticipantId={userParticipation?.id ?? null}
        userFriendParticipantId={friendParticipation?.id ?? null}
        isUpcoming={event.status === 'upcoming' || event.status === 'ongoing'}
        dict={{
          noConfirmedYet: dd.noConfirmedYet,
          pendingCount: dd.pendingCount,
          waitlistCount: dd.waitlistCount,
          noCarAssigned: dd.noCarAssigned,
          you: dd.you,
          ...dd.carpool, // includes the section title
          trip: d.carTrip,
        }}
      />
    </div>
  )
}
