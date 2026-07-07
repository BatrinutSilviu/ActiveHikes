import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AttendeeSection from '@/components/hikes/AttendeeSection'
import { ArrowLeft } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'

export default async function HikeCarpoolPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
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
        status: true,
        participants: {
          select: { id: true, userId: true, status: true, guestName: true, bringsCar: true, carSeats: true, carDriverParticipantId: true, user: { select: { name: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    }),
  ])

  if (!hike) notFound()

  const dd = d.hikeDetail
  const userParticipation = session?.user?.id
    ? hike.participants.find(p => p.userId === session.user.id) ?? null
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/${lang}/hikes/${hike.id}`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {hike.title}
      </Link>

      <AttendeeSection
        hikeId={hike.id}
        participants={hike.participants as any}
        userParticipantId={userParticipation?.id ?? null}
        isUpcoming={hike.status === 'upcoming'}
        dict={{
          title: dd.participantsSectionTitle,
          noConfirmedYet: dd.noConfirmedYet,
          pendingCount: dd.pendingCount,
          waitlistCount: dd.waitlistCount,
          noCarAssigned: (dd as any).noCarAssigned,
          ...(dd.carpool as any),
        }}
      />
    </div>
  )
}
