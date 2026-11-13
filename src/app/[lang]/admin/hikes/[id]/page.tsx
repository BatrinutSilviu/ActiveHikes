import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import ParticipantManager from '@/components/admin/ParticipantManager'
import WhatsAppGroupCompare from '@/components/admin/WhatsAppGroupCompare'
import PickupLocationsMap from '@/components/admin/PickupLocationsMapWrapper'
import HikeEditForm from '@/components/admin/HikeEditForm'
import PhotoUploader from '@/components/admin/PhotoUploader'
import { AdminActionLink, AdminEventHeader, AdminRegistrationCard, StatusCountsGrid } from '@/components/admin/AdminEventParts'
import { toRegistration } from '@/components/events/join/registration'
import { Car, BedDouble } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { waitlistOverduePending } from '@/lib/expireParticipants'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'
import { formatHikeDate, isEventPast } from '@/lib/dates'
import { participantStats, waitlistPosition } from '@/lib/participantStats'
import { managedParticipantInclude, toManagedParticipant } from '@/lib/adminParticipants'

export default async function AdminHikePage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  await Promise.all([waitlistOverduePending(), advanceEventStatuses()])

  const [d, session, hike, bankAccounts] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    prisma.hike.findFirst({
      where: { id, type: 'hike' },
      include: {
        participants: { include: managedParticipantInclude, orderBy: { joinedAt: 'asc' } },
        photos: { orderBy: { createdAt: 'asc' } },
        bankAccounts: { where: { isActive: true }, select: { id: true } },
      },
    }),
    prisma.bankAccount.findMany({ where: { isActive: true } }),
  ])

  if (!hike) notFound()

  const da = d.admin.hike

  const adminParticipation = session?.user?.id
    ? hike.participants.find(p => p.userId === session.user.id) ?? null
    : null

  const { waitlistCount, isFull } = participantStats(hike.participants, hike.maxParticipants)

  const participants = hike.participants.map(p => ({
    ...toManagedParticipant(p),
    bringsCar: p.bringsCar,
    carSeats: p.carSeats,
    carTrip: p.carTrip,
    carDriverParticipantId: p.carDriverParticipantId,
    pickupLat: p.pickupLat,
    pickupLng: p.pickupLng,
  }))

  const photos = hike.photos.map(p => ({ ...p, createdAt: p.createdAt.toISOString() }))

  const pickupPins = participants
    .filter(p => p.status === 'confirmed' && p.pickupLat != null && p.pickupLng != null)
    .map(p => ({
      id: p.id,
      label: p.user?.name ?? p.friendName ?? '?',
      lat: p.pickupLat!,
      lng: p.pickupLng!,
      isDriver: p.bringsCar,
    }))

  const hikeData = {
    ...hike,
    date: hike.date.toISOString(),
    endDate: hike.endDate ? hike.endDate.toISOString() : null,
    createdAt: hike.createdAt.toISOString(),
    entryFee: Number(hike.entryFee),
    durationHours: hike.durationHours ? Number(hike.durationHours) : null,
    campingPrice: hike.campingPrice ? Number(hike.campingPrice) : null,
    accommodationPrice: hike.accommodationPrice ? Number(hike.accommodationPrice) : null,
    accommodationDeposit: hike.accommodationDeposit ? Number(hike.accommodationDeposit) : null,
    bankAccountIds: hike.bankAccounts.map(a => a.id),
    participants: undefined,
    photos: undefined,
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <AdminEventHeader
        lang={lang}
        title={hike.title}
        subtitle={`${hike.destination} · ${formatHikeDate(hike.date, hike.endDate, d.locale, { day: 'numeric', month: 'long', year: 'numeric' })}`}
        publicUrl={`/${lang}/hikes/${hike.id}`}
        statusControl={{ hikeId: hike.id, status: hike.status, isPast: isEventPast(hike.date, hike.endDate, hike), dict: d.admin.hikeStatus }}
        dict={da}
      />

      <StatusCountsGrid participants={hike.participants} labels={da.status as Record<string, string>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold text-stone-800 mb-4">{da.participantsTitle}</h2>
          <ParticipantManager participants={participants} hikeId={hike.id} maxParticipants={hike.maxParticipants} dict={da} tripDict={d.carTrip} />

          <div className="mt-6">
            <WhatsAppGroupCompare
              eventId={hike.id}
              participants={participants}
              adminUserId={session?.user?.id ?? null}
              statusLabels={da.status as Record<string, string>}
              dict={{ ...d.admin.whatsappCompare, copyPhone: da.copyPhone, phoneCopied: da.phoneCopied, openWhatsApp: da.openWhatsApp }}
            />
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold text-stone-800 mb-4">{da.pickupLocationsTitle}</h2>
            {pickupPins.length > 0 ? (
              <PickupLocationsMap pins={pickupPins} dict={da} />
            ) : (
              <div className="bg-white border border-stone-100 rounded-2xl p-8 text-center text-stone-400">{da.noPickupLocations}</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4">{da.editTitle}</h2>
            <HikeEditForm hike={hikeData} bankAccounts={bankAccounts} dict={d.admin.hikeEdit} lang={lang} />
          </div>

          <AdminRegistrationCard
            title={da.myRegistration}
            hikeId={hike.id}
            userId={session?.user?.id ?? null}
            isFull={isFull}
            registration={toRegistration(adminParticipation)}
            waitlistPosition={waitlistPosition(hike.participants, session?.user?.id, adminParticipation?.status)}
            waitlistCount={waitlistCount}
            dict={d.joinButton}
            tripDict={d.carTrip}
            lang={lang}
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <AdminActionLink grow color="sky" href={`/${lang}/admin/hikes/${hike.id}/cars`} icon={<Car size={20} />} label={da.manageCars} />
            {hike.hasAccommodation && (
              <AdminActionLink grow color="violet" href={`/${lang}/admin/hikes/${hike.id}/rooms`} icon={<BedDouble size={20} />} label={da.manageRooms} />
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4">{da.photosTitle}</h2>
            <PhotoUploader hikeId={hike.id} existingPhotos={photos} />
          </div>
        </div>
      </div>
    </div>
  )
}
