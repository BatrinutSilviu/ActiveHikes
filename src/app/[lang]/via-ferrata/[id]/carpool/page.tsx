import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AttendeeSection from '@/components/hikes/AttendeeSection'
import { ArrowLeft } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'

export default async function ViaFerrataCarpoolPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  const [d, session, viaFerrata] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    prisma.hike.findFirst({
      where: { id, type: 'via_ferrata' },
      select: {
        id: true,
        title: true,
        status: true,
        participants: {
          select: { id: true, userId: true, status: true, friendName: true, hostParticipantId: true, bringsCar: true, carSeats: true, carDriverParticipantId: true, user: { select: { name: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    }),
  ])

  if (!viaFerrata) notFound()

  const dd = d.hikeDetail
  const userParticipation = session?.user?.id
    ? viaFerrata.participants.find(p => p.userId === session.user.id) ?? null
    : null
  const friendParticipation = userParticipation
    ? viaFerrata.participants.find(p => p.hostParticipantId === userParticipation.id) ?? null
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/${lang}/via-ferrata/${viaFerrata.id}`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {viaFerrata.title}
      </Link>

      <AttendeeSection
        hikeId={viaFerrata.id}
        participants={viaFerrata.participants as any}
        userParticipantId={userParticipation?.id ?? null}
        userFriendParticipantId={friendParticipation?.id ?? null}
        isUpcoming={viaFerrata.status === 'upcoming' || viaFerrata.status === 'ongoing'}
        dict={{
          title: dd.participantsSectionTitle,
          noConfirmedYet: dd.noConfirmedYet,
          pendingCount: dd.pendingCount,
          waitlistCount: dd.waitlistCount,
          noCarAssigned: (dd as any).noCarAssigned,
          you: dd.you,
          ...(dd.carpool as any),
        }}
      />
    </div>
  )
}
