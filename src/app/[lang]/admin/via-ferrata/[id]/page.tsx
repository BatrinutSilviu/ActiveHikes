import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ViaFerrataParticipantManager from '@/components/admin/ViaFerrataParticipantManager'
import ViaFerrataEditForm from '@/components/admin/ViaFerrataEditForm'
import ViaFerrataDocumentUploader from '@/components/admin/ViaFerrataDocumentUploader'
import JoinButton from '@/components/hikes/JoinButton'
import { ArrowLeft, Car, ChevronRight } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { expireOverduePending } from '@/lib/expireParticipants'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'

export default async function AdminViaFerrataPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  await Promise.all([expireOverduePending(), advanceEventStatuses()])

  const [d, session, viaFerrata] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    prisma.hike.findFirst({
      where: { id, type: 'via_ferrata' },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            friend: { select: { id: true, friendName: true } },
            host: { select: { id: true, user: { select: { name: true } } } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        documents: { orderBy: { createdAt: 'asc' } },
      },
    }),
  ])

  if (!viaFerrata) notFound()

  const da = d.admin.viaFerrata

  const adminParticipation = session?.user?.id
    ? viaFerrata.participants.find(p => p.userId === session.user.id) ?? null
    : null

  const waitlistParticipants = viaFerrata.participants.filter(p => p.status === 'waitlist')
  const adminWaitlistPosition = adminParticipation?.status === 'waitlist'
    ? waitlistParticipants.findIndex(p => p.userId === session?.user?.id) + 1
    : null

  const counts = {
    confirmed: viaFerrata.participants.filter(p => p.status === 'confirmed').length,
    pending: viaFerrata.participants.filter(p => p.status === 'pending').length,
    waitlist: waitlistParticipants.length,
    rejected: viaFerrata.participants.filter(p => p.status === 'rejected').length,
    expired: viaFerrata.participants.filter(p => p.status === 'expired').length,
  }

  const participants = viaFerrata.participants.map(p => ({
    id: p.id,
    userId: p.userId,
    viaFerrataId: p.hikeId,
    status: p.status,
    joinedAt: p.joinedAt.toISOString(),
    paymentDeadline: p.paymentDeadline ? p.paymentDeadline.toISOString() : null,
    adminNotes: p.adminNotes,
    friendName: p.friendName,
    hostParticipantId: p.hostParticipantId,
    hostName: p.host?.user?.name ?? null,
    linkedFriend: p.friend ? { id: p.friend.id, name: p.friend.friendName } : null,
    user: p.user,
  }))

  const confirmedCount = counts.confirmed
  const spotsLeft = viaFerrata.maxParticipants - confirmedCount
  const isFull = spotsLeft <= 0

  const viaFerrataData = {
    id: viaFerrata.id,
    title: viaFerrata.title,
    destination: viaFerrata.destination,
    description: viaFerrata.description,
    date: viaFerrata.date.toISOString(),
    entryFee: Number(viaFerrata.entryFee),
    maxParticipants: viaFerrata.maxParticipants,
    durationHours: viaFerrata.durationHours ? Number(viaFerrata.durationHours) : null,
    startingPoint: viaFerrata.startingPoint,
    meetingPoint: viaFerrata.meetingPoint,
    meetingTime: viaFerrata.meetingTime,
    essentials: viaFerrata.essentials,
    status: viaFerrata.status,
    coverImageUrl: viaFerrata.coverImageUrl,
  }

  const documents = viaFerrata.documents.map(document => ({
    id: document.id,
    url: document.url,
    name: document.name,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href={`/${lang}/admin`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {da.backToDashboard}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{viaFerrata.title}</h1>
          <p className="text-stone-500 mt-1">
            {viaFerrata.destination} · {new Date(viaFerrata.date).toLocaleDateString(d.locale, { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href={`/${lang}/via-ferrata/${viaFerrata.id}`} className="text-emerald-600 hover:underline text-sm font-medium" target="_blank">
          {da.viewPublicPage}
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="bg-white border border-stone-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-stone-900">{count}</div>
            <div className="text-xs text-stone-500 capitalize mt-0.5">{(da.status as Record<string, string>)[status] ?? status}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold text-stone-800 mb-4">{da.participantsTitle}</h2>
          <ViaFerrataParticipantManager participants={participants} viaFerrataId={viaFerrata.id} maxParticipants={viaFerrata.maxParticipants} dict={da} />
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4">{da.editTitle}</h2>
            <ViaFerrataEditForm viaFerrata={viaFerrataData} dict={d.admin.viaFerrataEdit} />
          </div>

          <ViaFerrataDocumentUploader viaFerrataId={viaFerrata.id} existingDocuments={documents} dict={da.documents} />

          <div className="bg-white border border-stone-100 rounded-2xl p-5">
            <h2 className="text-xl font-bold text-stone-800 mb-4">{da.myRegistration}</h2>
            <JoinButton
              hikeId={viaFerrata.id}
              userId={session?.user?.id ?? null}
              isFull={isFull}
              participationStatus={adminParticipation?.status ?? null}
              currentBringsCar={adminParticipation?.bringsCar ?? false}
              currentCarSeats={adminParticipation?.carSeats ?? null}
              currentPickupLat={adminParticipation?.pickupLat ?? null}
              currentPickupLng={adminParticipation?.pickupLng ?? null}
              paymentDeadline={adminParticipation?.paymentDeadline ? adminParticipation.paymentDeadline.toISOString() : null}
              waitlistPosition={adminWaitlistPosition}
              waitlistCount={waitlistParticipants.length}
              dict={d.joinButton}
              lang={lang}
            />
          </div>

          <Link href={`/${lang}/admin/hikes/${viaFerrata.id}/cars`}
            className="group flex items-center gap-3 bg-gradient-to-br from-sky-500 to-sky-700 text-white rounded-2xl p-4 shadow-md shadow-sky-200 hover:shadow-lg hover:shadow-sky-300 hover:-translate-y-0.5 transition-all">
            <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Car size={20} />
            </span>
            <span className="font-bold flex-1">{da.manageCars}</span>
            <ChevronRight size={18} className="text-white/70 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}
