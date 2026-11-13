import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import JoinButton from '@/components/events/join/JoinButton'
import { toRegistration } from '@/components/events/join/registration'
import SpotsCounter from '@/components/events/SpotsCounter'
import ParticipantsCount from '@/components/events/ParticipantsCount'
import ParticipantsLine from '@/components/events/ParticipantsLine'
import { AdminPreviewBar, CarpoolLink, EventHero, InfoCard, WhatsAppGroupLink } from '@/components/events/EventDetail'
import { PaymentInstructions, PriceSummary } from '@/components/events/EventPayment'
import PhotoGallery from '@/components/hikes/PhotoGallery'
import GpxSection from '@/components/hikes/GpxSection'
import EssentialsSection from '@/components/hikes/EssentialsSection'
import { HikeCampingBox, HikeAccommodationBox } from '@/components/hikes/HikeStayDetails'
import { Calendar, Users, Clock, Tent, Hotel, DollarSign, Mountain, ExternalLink, Navigation, Car } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { waitlistOverduePending } from '@/lib/expireParticipants'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'
import { formatHikeDate } from '@/lib/dates'
import { getConfirmationPrice } from '@/lib/pricing'
import { priceOrFree } from '@/lib/money'
import { participantStats, waitlistPosition } from '@/lib/participantStats'
import { spotsApiUrl } from '@/lib/eventPaths'

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-700 bg-green-100',
  easy_medium: 'text-lime-700 bg-lime-100',
  medium: 'text-yellow-700 bg-yellow-100',
  medium_hard: 'text-orange-700 bg-orange-100',
  hard: 'text-red-700 bg-red-100',
}

export default async function HikeDetailPage({ params, searchParams }: {
  params: Promise<{ lang: string; id: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { lang, id } = await params
  const { preview } = await searchParams
  if (!hasLocale(lang)) notFound()

  await Promise.all([waitlistOverduePending(), advanceEventStatuses()])

  const [d, session] = await Promise.all([getDictionary(lang), getServerSession(authOptions)])

  const hike = await prisma.hike.findFirst({
    where: { id, type: 'hike' },
    include: {
      participants: {
        select: { id: true, userId: true, status: true, friendName: true, hostParticipantId: true, bringsCar: true, carSeats: true, carDriverParticipantId: true, user: { select: { name: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      photos: { orderBy: { createdAt: 'asc' } },
      rooms: {
        orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
        include: { occupants: { select: { id: true } } },
      },
      bankAccounts: { where: { isActive: true } },
    },
  })
  if (!hike) notFound()

  const isAdmin = session?.user?.role === 'admin'
  if (hike.status === 'draft' && !isAdmin) notFound()

  // Admins can look at the page as a confirmed participant would see it.
  const isPreviewMode = isAdmin && preview === '1'

  const userParticipation = session?.user?.id
    ? await prisma.hikeParticipant.findUnique({
        where: { hikeId_userId: { hikeId: id, userId: session.user.id } },
        include: { friend: { select: { id: true, friendName: true } } },
      })
    : null
  // A friend registered alongside the user pays the same price again.
  const hasFriend = !!userParticipation?.friend
  const priceMultiplier = hasFriend ? 2 : 1
  const showsAsConfirmed = isPreviewMode || userParticipation?.status === 'confirmed'

  const { confirmedCount, waitlistCount, spotsLeft, isFull } = participantStats(hike.participants, hike.maxParticipants)
  const userWaitlistPosition = waitlistPosition(hike.participants, session?.user?.id, userParticipation?.status)
  const isUpcoming = hike.status === 'upcoming' || (hike.status === 'draft' && isAdmin)

  const entryFee = Number(hike.entryFee)
  const accommodationPrice = hike.hasAccommodation && hike.accommodationPrice ? Number(hike.accommodationPrice) : 0
  const accommodationDeposit = hike.hasAccommodation && hike.accommodationDeposit ? Number(hike.accommodationDeposit) : 0
  const confirmationPrice = getConfirmationPrice(hike)
  const totalPrice = entryFee + accommodationPrice
  const carsCount = hike.carsNeeded ?? Math.ceil(hike.maxParticipants / hike.peoplePerCar)
  const carsCountIsAuto = !hike.carsNeeded
  const photos = hike.photos.map(p => ({ ...p, createdAt: p.createdAt.toISOString() }))
  const hasRooms = hike.rooms.length > 0

  const dd = d.hikeDetail
  const difficultyLabels = dd.difficulty as Record<string, string>
  const difficultyDescs = dd.difficultyDesc as Record<string, string>
  const dateLocale = d.locale
  const counts = { confirmedCount, maxParticipants: hike.maxParticipants, waitlistCount }
  const countsDict = { confirmed: dd.confirmed, onWaitlist: dd.onWaitlist }
  // Shown when part of the confirmation price is an accommodation deposit.
  const feeBreakdown = accommodationDeposit > 0
    ? dd.feeBreakdown
        .replace('{entryFee}', String(entryFee * priceMultiplier))
        .replace('{deposit}', String(accommodationDeposit * priceMultiplier))
    : null

  // The grid places blocks in two columns on desktop; `order-*` sets the stacking on mobile
  // (details, registration, sidebar links, more details, photos, route).
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <AdminPreviewBar isAdmin={isAdmin} isPreviewMode={isPreviewMode} eventUrl={`/${lang}/hikes/${hike.id}`} dict={dd} />
      {hike.status === 'draft' && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium">
          {dd.draftNotice}
        </div>
      )}
      <EventHero
        title={hike.title}
        destination={hike.destination}
        mountainRange={hike.mountainRange}
        coverImageUrl={hike.coverImageUrl}
        coverImageUrl2={hike.coverImageUrl2}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* General details — mobile order 1, desktop left column top */}
        <div className="order-1 lg:col-start-1 lg:col-span-2 lg:row-start-1 space-y-8">
          {hike.description && <p className="text-stone-700 leading-relaxed text-lg whitespace-pre-wrap">{hike.description}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard icon={<Mountain size={18} />} label={dd.difficultyLabel}>
              {hike.difficulty
                ? <>
                    <span className={(DIFFICULTY_COLORS[hike.difficulty] ?? '') + ' px-2 py-0.5 rounded-full text-xs font-semibold'}>{difficultyLabels[hike.difficulty] ?? hike.difficulty}</span>
                    {difficultyDescs[hike.difficulty] && (
                      <p className="text-stone-400 text-xs font-normal mt-2 leading-relaxed">{difficultyDescs[hike.difficulty]}</p>
                    )}
                  </>
                : dd.notSet}
            </InfoCard>
            <InfoCard icon={<Calendar size={18} />} label={dd.dateLabel}>
              {hike.endDate
                ? formatHikeDate(hike.date, hike.endDate, dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
                : new Date(hike.date).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </InfoCard>
            <InfoCard icon={<Clock size={18} />} label={dd.meetingTimeLabel}>
              {hike.meetingTime ?? dd.notSet}
            </InfoCard>
            <InfoCard icon={<Car size={18} />} label={dd.meetingPointLabel}>
              {hike.meetingPoint ?? dd.notSet}
            </InfoCard>
            <InfoCard icon={<Navigation size={18} />} label={dd.startingPointLabel}>
              {hike.startingPoint ?? dd.notSet}
            </InfoCard>
            <InfoCard icon={<Clock size={18} />} label={dd.durationLabel}>
              {hike.durationHours ? `${Number(hike.durationHours)} ${dd.durationUnit}` : dd.notSet}
            </InfoCard>
            <InfoCard icon={<Users size={18} />} label={dd.participantsLabel}>
              {isUpcoming
                ? <ParticipantsCount spotsUrl={spotsApiUrl('hike', hike.id)} initial={counts} dict={countsDict} />
                : <ParticipantsLine counts={counts} dict={countsDict} />}
            </InfoCard>
            <InfoCard icon={<DollarSign size={18} />} label={dd.entryFeeLabel}>
              {priceOrFree(entryFee, dd.free)}
            </InfoCard>
            <InfoCard icon={<Car size={18} />} label={dd.carsLabel}>
              {carsCount} {carsCountIsAuto && <span className="text-stone-400 text-xs">({dd.carsAuto})</span>}
            </InfoCard>
            <InfoCard icon={<Tent size={18} />} label={dd.campingLabel}>
              <span className={hike.hasCamping ? 'text-amber-600 font-semibold' : 'text-stone-400'}>
                {hike.hasCamping ? dd.yes : dd.no}
              </span>
            </InfoCard>
            <InfoCard icon={<Hotel size={18} />} label={dd.accommodationLabel}>
              <span className={hike.hasAccommodation ? 'text-blue-600 font-semibold' : 'text-stone-400'}>
                {hike.hasAccommodation ? dd.yes : dd.no}
              </span>
            </InfoCard>
          </div>
        </div>

        {/* Registration panel — mobile order 2 (right after general details), desktop right column top */}
        {isUpcoming && (
          <div className="order-2 lg:col-start-3 lg:row-start-1 self-start bg-white border border-stone-100 rounded-3xl p-6 shadow-md">
            <PriceSummary
              totalPrice={totalPrice}
              confirmationPrice={confirmationPrice}
              priceMultiplier={priceMultiplier}
              hasFriend={hasFriend}
              breakdown={feeBreakdown}
              dict={dd}
            >
              <p className="flex items-start justify-center gap-1.5 text-stone-400 text-xs mt-3 leading-relaxed text-left">
                <Car size={13} className="shrink-0 mt-0.5" /> {dd.gasNotIncluded.replace('{count}', String(carsCount))}
              </p>
            </PriceSummary>

            <SpotsCounter
              spotsUrl={spotsApiUrl('hike', hike.id)}
              initial={{ ...counts, spotsLeft, isFull }}
              dict={d.spots}
            />

            <JoinButton
              hikeId={hike.id}
              userId={session?.user?.id ?? null}
              isFull={isFull}
              registration={toRegistration(userParticipation)}
              waitlistPosition={userWaitlistPosition}
              waitlistCount={waitlistCount}
              dict={d.joinButton}
              tripDict={d.carTrip}
              lang={lang}
            />

          </div>
        )}

        {/* Rest of left column content — mobile order 4, desktop left column (after general details) */}
        <div className="order-4 lg:col-start-1 lg:col-span-2 lg:row-start-2 space-y-8">
          <CarpoolLink href={`/${lang}/hikes/${hike.id}/carpool`} label={dd.participantsSectionTitle} />

          {hike.hasCamping && (hike.campingDetails || hike.campingUrl || hike.campingPrice) && (
            <HikeCampingBox hike={hike} dict={dd} />
          )}

          {hike.hasAccommodation && (hike.accommodationDetails || hike.accommodationUrl || hike.accommodationPrice || hike.breakfastTime || hike.dinnerTime || hike.checkInTime || hike.checkOutTime || hasRooms) && (
            <HikeAccommodationBox hike={hike} roomsUrl={hasRooms ? `/${lang}/hikes/${hike.id}/rooms` : null} dict={dd} />
          )}

          <EssentialsSection items={hike.essentials} title={dd.essentialsTitle} />
        </div>

        {/* Route — mobile order last, desktop left column (unchanged position) */}
        <div className="order-6 lg:col-start-1 lg:col-span-2 lg:row-start-3">
          <GpxSection approximateUrl={hike.gpxApproximateUrl} actualUrl={hike.gpxActualUrl} dict={d.gpx} />
        </div>

        {/* Photos — mobile order 5, desktop left column (unchanged position) */}
        {photos.length > 0 && (
          <div className="order-5 lg:col-start-1 lg:col-span-2 lg:row-start-4">
            <h2 className="text-2xl font-bold text-stone-900 mb-4">{dd.photosTitle}</h2>
            <PhotoGallery photos={photos} />
            {hike.externalPhotosUrl && (
              <a href={hike.externalPhotosUrl} target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                <ExternalLink size={15} /> {dd.viewFullAlbum}
              </a>
            )}
          </div>
        )}

        {/* Rest of sidebar content — mobile order 3, desktop right column (after registration panel) */}
        <div className="order-3 lg:col-start-3 lg:row-start-2 self-start space-y-4">
          {hike.whatsappGroupUrl && showsAsConfirmed && (
            <WhatsAppGroupLink url={hike.whatsappGroupUrl} label={dd.joinWhatsApp} />
          )}

          {confirmationPrice > 0 && hike.bankAccounts.length > 0 && (
            <PaymentInstructions
              accounts={hike.bankAccounts}
              amount={confirmationPrice * priceMultiplier}
              hasFriend={hasFriend}
              note={feeBreakdown}
              dict={dd}
            />
          )}

          {hike.status === 'completed' && hike.externalPhotosUrl && photos.length === 0 && (
            <a href={hike.externalPhotosUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-700 text-white font-semibold py-3 px-4 rounded-2xl transition-colors text-sm">
              <ExternalLink size={16} /> {dd.viewFullAlbum}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
