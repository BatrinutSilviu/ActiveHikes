import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ParticipantManager from '@/components/admin/ParticipantManager'
import HikeEditForm from '@/components/admin/HikeEditForm'
import PhotoUploader from '@/components/admin/PhotoUploader'
import JoinButton from '@/components/hikes/JoinButton'
import { ArrowLeft } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function AdminHikePage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  const [d, session, hike] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    prisma.hike.findUnique({
      where: { id },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true, phone: true } } }, orderBy: { joinedAt: 'asc' } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
    }),
  ])

  if (!hike) notFound()

  const da = d.admin.hike

  const adminParticipation = session?.user?.id
    ? hike.participants.find(p => p.userId === session.user.id) ?? null
    : null

  const counts = {
    confirmed: hike.participants.filter(p => p.status === 'confirmed').length,
    pending: hike.participants.filter(p => p.status === 'pending').length,
    waitlist: hike.participants.filter(p => p.status === 'waitlist').length,
    rejected: hike.participants.filter(p => p.status === 'rejected').length,
  }

  const participants = hike.participants.map(p => ({
    id: p.id,
    userId: p.userId,
    hikeId: p.hikeId,
    status: p.status,
    joinedAt: p.joinedAt.toISOString(),
    adminNotes: p.adminNotes,
    guestName: p.guestName,
    bringsCar: p.bringsCar,
    carSeats: p.carSeats,
    carDriverParticipantId: p.carDriverParticipantId,
    user: p.user,
  }))

  const photos = hike.photos.map(p => ({ ...p, createdAt: p.createdAt.toISOString() }))

  const confirmedCount = counts.confirmed
  const spotsLeft = hike.maxParticipants - confirmedCount
  const isFull = spotsLeft <= 0

  const hikeData = {
    ...hike,
    date: hike.date.toISOString(),
    createdAt: hike.createdAt.toISOString(),
    entryFee: Number(hike.entryFee),
    durationHours: hike.durationHours ? Number(hike.durationHours) : null,
    campingPrice: hike.campingPrice ? Number(hike.campingPrice) : null,
    accommodationPrice: hike.accommodationPrice ? Number(hike.accommodationPrice) : null,
    accommodationDeposit: hike.accommodationDeposit ? Number(hike.accommodationDeposit) : null,
    participants: undefined,
    photos: undefined,
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href={`/${lang}/admin`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {da.backToDashboard}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{hike.title}</h1>
          <p className="text-stone-500 mt-1">
            {hike.destination} · {hike.date.toLocaleDateString(d.locale, { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href={`/${lang}/hikes/${hike.id}`} className="text-emerald-600 hover:underline text-sm font-medium" target="_blank">
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
          <ParticipantManager participants={participants} hikeId={hike.id} maxParticipants={hike.maxParticipants} dict={da} />
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-stone-100 rounded-2xl p-5">
            <h2 className="text-xl font-bold text-stone-800 mb-4">{da.myRegistration}</h2>
            <JoinButton
              hikeId={hike.id}
              userId={session?.user?.id ?? null}
              isFull={isFull}
              participationStatus={adminParticipation?.status ?? null}
              dict={d.joinButton}
              lang={lang}
            />
          </div>

          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4">{da.photosTitle}</h2>
            <PhotoUploader hikeId={hike.id} existingPhotos={photos} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4">{da.editTitle}</h2>
            <HikeEditForm hike={hikeData as any} dict={d.admin.hikeEdit} />
          </div>
        </div>
      </div>
    </div>
  )
}
