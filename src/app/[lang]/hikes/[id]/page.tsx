import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import JoinButton from '@/components/hikes/JoinButton'
import SpotsCounter from '@/components/hikes/SpotsCounter'
import ParticipantsCount from '@/components/hikes/ParticipantsCount'
import PhotoGallery from '@/components/hikes/PhotoGallery'
import GpxSection from '@/components/hikes/GpxSection'
import EssentialsSection from '@/components/hikes/EssentialsSection'
import Link from 'next/link'
import { Calendar, MapPin, Users, Clock, Tent, Hotel, DollarSign, Mountain, MountainSnow, ExternalLink, Navigation, Car, MessageCircle } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { expireOverduePending } from '@/lib/expireParticipants'
import { formatHikeDate } from '@/lib/dates'

export default async function HikeDetailPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  await expireOverduePending()

  const [d, session] = await Promise.all([getDictionary(lang), getServerSession(authOptions)])

  const hike = await prisma.hike.findUnique({
    where: { id },
    include: {
      participants: {
        select: { id: true, userId: true, status: true, guestName: true, bringsCar: true, carSeats: true, carDriverParticipantId: true, user: { select: { name: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      photos: { orderBy: { createdAt: 'asc' } },
      rooms: {
        orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
        include: { occupants: { select: { id: true } } },
      },
    },
  })
  if (!hike) notFound()

  const rooms = hike.rooms.map(r => ({
    id: r.id,
    type: r.type,
    label: r.label,
    capacity: r.capacity,
    occupied: r.occupants.length,
  }))

  const bankAccounts = await prisma.bankAccount.findMany({ where: { isActive: true } })

  let userParticipation = null
  if (session?.user?.id) {
    userParticipation = await prisma.hikeParticipant.findUnique({
      where: { hikeId_userId: { hikeId: id, userId: session.user.id } },
    })
  }

  const confirmedCount = hike.participants.filter(p => p.status === 'confirmed').length
  const waitlistParticipants = hike.participants.filter(p => p.status === 'waitlist')
  const waitlistCount = waitlistParticipants.length
  const userWaitlistPosition = userParticipation?.status === 'waitlist'
    ? waitlistParticipants.findIndex(p => p.userId === session?.user?.id) + 1
    : null
  const spotsLeft = hike.maxParticipants - confirmedCount
  const isFull = spotsLeft <= 0
  const isUpcoming = hike.status === 'upcoming'
  const entryFee = Number(hike.entryFee)
  const accommodationPrice = hike.hasAccommodation && hike.accommodationPrice ? Number(hike.accommodationPrice) : 0
  const accommodationDeposit = hike.hasAccommodation && hike.accommodationDeposit ? Number(hike.accommodationDeposit) : 0
  const confirmationPrice = entryFee + accommodationDeposit
  const totalPrice = entryFee + accommodationPrice
  const photos = hike.photos.map(p => ({ ...p, createdAt: p.createdAt.toISOString() }))

  const dd = d.hikeDetail
  const difficultyLabels = dd.difficulty as Record<string, string>
  const difficultyDescs = dd.difficultyDesc as Record<string, string>
  const statusLabels = dd.status as Record<string, string>
  const dateLocale = d.locale

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="w-full h-72 sm:h-[28rem] rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-emerald-900 to-stone-800 relative shadow-xl">
        {hike.coverImageUrl ? (
          <img src={hike.coverImageUrl} alt={hike.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Mountain size={72} className="text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-8 pb-6 sm:pb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-1 leading-tight drop-shadow">{hike.title}</h1>
          <p className="text-stone-300 flex items-center gap-1.5 text-base">
            <MapPin size={15} /> {hike.destination}
          </p>
          {hike.mountainRange && (
            <p className="text-stone-400 flex items-center gap-1 mt-0.5 text-sm">
              <MountainSnow size={13} /> {hike.mountainRange}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* General details — mobile order 1, desktop left column top */}
        <div className="order-1 lg:col-start-1 lg:col-span-2 lg:row-start-1 space-y-8">
          {hike.description && <p className="text-stone-700 leading-relaxed text-lg whitespace-pre-wrap">{hike.description}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard icon={<Mountain size={18} />} label={dd.difficultyLabel}>
              {hike.difficulty
                ? <>
                    <span className={difficultyColor(hike.difficulty) + ' px-2 py-0.5 rounded-full text-xs font-semibold'}>{difficultyLabels[hike.difficulty] ?? hike.difficulty}</span>
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
              {isUpcoming ? (
                <ParticipantsCount
                  hikeId={hike.id}
                  initial={{ confirmedCount, maxParticipants: hike.maxParticipants, waitlistCount }}
                  dict={{ confirmed: dd.confirmed, onWaitlist: dd.onWaitlist }}
                />
              ) : (
                <>
                  {confirmedCount}/{hike.maxParticipants} {dd.confirmed}
                  {waitlistCount > 0 && <span className="text-stone-400 text-sm ml-1">· {waitlistCount} {dd.onWaitlist}</span>}
                </>
              )}
            </InfoCard>
            <InfoCard icon={<DollarSign size={18} />} label={dd.entryFeeLabel}>
              {entryFee > 0 ? `${entryFee} RON` : dd.free}
            </InfoCard>
            <InfoCard icon={<Car size={18} />} label={dd.carsLabel}>
              {(() => {
                const count = hike.carsNeeded ?? Math.ceil(hike.maxParticipants / hike.peoplePerCar)
                const isAuto = !hike.carsNeeded
                return <>{count} {isAuto && <span className="text-stone-400 text-xs">({dd.carsAuto})</span>}</>
              })()}
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

        {/* Confirmation panel — mobile order 2 (right after general details), desktop right column top */}
        {isUpcoming && (
          <div className="order-2 lg:col-start-3 lg:row-start-1 self-start bg-white border border-stone-100 rounded-3xl p-6 shadow-md">
            <div className="text-center mb-5">
              {totalPrice > confirmationPrice ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900">{totalPrice} RON</div>
                    <div className="text-stone-400 text-[11px] uppercase tracking-wide mt-1">{dd.totalPriceLabel}</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700">{confirmationPrice} RON</div>
                    <div className="text-stone-400 text-[11px] uppercase tracking-wide mt-1">{dd.confirmationPriceLabel}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-4xl font-black tracking-tight text-stone-900">
                    {confirmationPrice > 0 ? `${confirmationPrice} RON` : dd.free}
                  </div>
                  {confirmationPrice > 0 && <p className="text-stone-400 text-sm mt-1">{dd.perPerson}</p>}
                </>
              )}
              {accommodationDeposit > 0 && (
                <p className="text-stone-400 text-xs mt-2 leading-relaxed">
                  {dd.feeBreakdown
                    .replace('{entryFee}', String(entryFee))
                    .replace('{deposit}', String(accommodationDeposit))}
                </p>
              )}
              <p className="flex items-center justify-center gap-1.5 text-stone-400 text-xs mt-3 leading-relaxed">
                <Car size={13} className="shrink-0" /> {dd.gasNotIncluded}
              </p>
            </div>

            <SpotsCounter
              hikeId={hike.id}
              initial={{ confirmedCount, maxParticipants: hike.maxParticipants, spotsLeft, isFull, waitlistCount }}
              dict={d.spots}
            />

            <JoinButton
              hikeId={hike.id}
              userId={session?.user?.id ?? null}
              isFull={isFull}
              participationStatus={userParticipation?.status ?? null}
              currentBringsCar={userParticipation?.bringsCar ?? false}
              currentCarSeats={userParticipation?.carSeats ?? null}
              currentPickupLat={userParticipation?.pickupLat ?? null}
              currentPickupLng={userParticipation?.pickupLng ?? null}
              paymentDeadline={userParticipation?.paymentDeadline ? userParticipation.paymentDeadline.toISOString() : null}
              waitlistPosition={userWaitlistPosition}
              waitlistCount={waitlistCount}
              dict={d.joinButton}
              lang={lang}
            />

          </div>
        )}

        {/* Rest of left column content — mobile order 4, desktop left column (after general details) */}
        <div className="order-4 lg:col-start-1 lg:col-span-2 lg:row-start-2 space-y-8">
          <Link
            href={`/${lang}/hikes/${hike.id}/carpool`}
            className="flex items-center justify-between gap-2 bg-white border border-stone-200 rounded-xl p-4 hover:border-emerald-300 transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold text-stone-800">
              <Car size={18} className="text-emerald-600" /> {dd.participantsSectionTitle}
            </span>
            <ExternalLink size={15} className="text-stone-300" />
          </Link>

          {hike.hasCamping && (hike.campingDetails || hike.campingUrl || hike.campingPrice) && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                <Tent size={16} /> {dd.campingTitle}
              </h3>
              {hike.campingDetails && (
                <p className="text-amber-700 text-sm break-words">{hike.campingDetails}</p>
              )}
              {hike.campingUrl && (
                <a
                  href={hike.campingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  <ExternalLink size={15} /> {dd.campingBookingLink}
                </a>
              )}
              {hike.campingPrice && (
                <div className="bg-white rounded-lg p-3 inline-block text-center">
                  <div className="text-lg font-bold text-amber-800">{Number(hike.campingPrice)} RON</div>
                  <div className="text-xs text-amber-500 mt-0.5">{dd.campingCost}</div>
                </div>
              )}
            </div>
          )}

          {hike.hasAccommodation && (hike.accommodationDetails || hike.accommodationUrl || hike.accommodationPrice || hike.breakfastTime || hike.dinnerTime || hike.checkInTime || hike.checkOutTime || rooms.length > 0) && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                <Hotel size={16} /> {dd.accommodationTitle}
              </h3>
              {hike.accommodationDetails && (
                <p className="text-blue-700 text-sm break-words">{hike.accommodationDetails}</p>
              )}
              {hike.accommodationUrl && (
                <a
                  href={hike.accommodationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  <ExternalLink size={15} /> {dd.accommodationBookingLink}
                </a>
              )}
              {hike.accommodationPrice && (() => {
                const price = Number(hike.accommodationPrice)
                const deposit = hike.accommodationDeposit ? Number(hike.accommodationDeposit) : null
                return (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-blue-800">{price} RON</div>
                      <div className="text-xs text-blue-500 mt-0.5">{dd.accommodationCost}</div>
                    </div>
                    {deposit && (
                      <>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-amber-700">{deposit} RON</div>
                          <div className="text-xs text-amber-500 mt-0.5">{dd.accommodationDeposit}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-stone-700">{price - deposit} RON</div>
                          <div className="text-xs text-stone-400 mt-0.5">{dd.accommodationRemaining}</div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}
              {(hike.checkInTime || hike.checkOutTime || hike.breakfastTime || hike.dinnerTime) && (
                <div className="flex flex-wrap gap-4">
                  {hike.checkInTime && (
                    <span className="flex items-center gap-1.5 text-sm text-blue-700">
                      <Clock size={14} /> {dd.checkInTime}: {hike.checkInTime}
                    </span>
                  )}
                  {hike.checkOutTime && (
                    <span className="flex items-center gap-1.5 text-sm text-blue-700">
                      <Clock size={14} /> {dd.checkOutTime}: {hike.checkOutTime}
                    </span>
                  )}
                  {hike.breakfastTime && (
                    <span className="flex items-center gap-1.5 text-sm text-blue-700">
                      <Clock size={14} /> {dd.breakfastTime}: {hike.breakfastTime}
                    </span>
                  )}
                  {hike.dinnerTime && (
                    <span className="flex items-center gap-1.5 text-sm text-blue-700">
                      <Clock size={14} /> {dd.dinnerTime}: {hike.dinnerTime}
                    </span>
                  )}
                </div>
              )}
              {rooms.length > 0 && (
                <Link
                  href={`/${lang}/hikes/${hike.id}/rooms`}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  <ExternalLink size={15} /> {dd.roomsTitle}
                </Link>
              )}
            </div>
          )}

          <EssentialsSection items={hike.essentials} title={dd.essentialsTitle} />
        </div>

        {/* Route — mobile order last, desktop left column (unchanged position) */}
        <div className="order-6 lg:col-start-1 lg:col-span-2 lg:row-start-3">
          <GpxSection approximateUrl={hike.gpxApproximateUrl} actualUrl={hike.gpxActualUrl} isCompleted={hike.status === 'completed'} dict={d.gpx} />
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

        {/* Rest of sidebar content — mobile order 3, desktop right column (after confirmation panel) */}
        <div className="order-3 lg:col-start-3 lg:row-start-2 self-start space-y-4">
          {hike.whatsappGroupUrl && userParticipation?.status === 'confirmed' && (
            <a href={hike.whatsappGroupUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-2xl transition-colors">
              <MessageCircle size={18} /> {dd.joinWhatsApp}
            </a>
          )}

          {confirmationPrice > 0 && bankAccounts.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <DollarSign size={16} /> {dd.paymentTitle}
              </h3>
              <p className="text-amber-700 text-sm mb-4">
                {dd.paymentDesc.replace('{fee}', String(confirmationPrice))}
              </p>
              {accommodationDeposit > 0 && (
                <p className="text-amber-600 text-xs font-medium bg-amber-100/70 rounded-lg px-3 py-2 mb-4">
                  {dd.feeBreakdown
                    .replace('{entryFee}', String(entryFee))
                    .replace('{deposit}', String(accommodationDeposit))}
                </p>
              )}
              {bankAccounts.map(account => {
                const methodLabel = account.type === 'revolut' ? 'Revolut' : account.type === 'btpay' ? 'BT Pay' : account.bankName
                const revolutTag = account.type === 'revolut' && account.paymentHandle?.startsWith('@')
                  ? account.paymentHandle.slice(1)
                  : null
                return (
                  <div key={account.id} className="bg-white rounded-xl p-4 mb-3 last:mb-0 border border-amber-100">
                    <div className="font-semibold text-stone-800">{methodLabel}</div>
                    <div className="text-stone-600 text-sm">{account.accountHolder}</div>
                    <div className="font-mono text-sm mt-1 text-stone-700 break-all">
                      {account.type === 'bank' ? account.iban : account.paymentHandle}
                    </div>
                    {revolutTag && (
                      <a
                        href={`https://revolut.me/${revolutTag}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2.5 bg-stone-900 hover:bg-stone-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <ExternalLink size={12} /> {dd.payWithRevolut}
                      </a>
                    )}
                    {account.notes && <p className="text-stone-400 text-xs mt-1">{account.notes}</p>}
                  </div>
                )
              })}
            </div>
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

function difficultyColor(d: string) {
  const m: Record<string, string> = {
    easy: 'text-green-700 bg-green-100',
    easy_medium: 'text-lime-700 bg-lime-100',
    medium: 'text-yellow-700 bg-yellow-100',
    medium_hard: 'text-orange-700 bg-orange-100',
    hard: 'text-red-700 bg-red-100',
  }
  return m[d] ?? ''
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-stone-950/[0.04]">
      <div className="flex items-center gap-1.5 text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">{icon} {label}</div>
      <div className="text-stone-900 font-semibold text-sm leading-snug">{children}</div>
    </div>
  )
}
