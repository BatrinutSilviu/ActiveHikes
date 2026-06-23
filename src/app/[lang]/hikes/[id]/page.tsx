import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import JoinButton from '@/components/hikes/JoinButton'
import SpotsCounter from '@/components/hikes/SpotsCounter'
import PhotoGallery from '@/components/hikes/PhotoGallery'
import GpxSection from '@/components/hikes/GpxSection'
import CarpoolSection from '@/components/hikes/CarpoolSection'
import Link from 'next/link'
import { Calendar, MapPin, Users, Clock, Tent, Hotel, DollarSign, Mountain, ExternalLink, Navigation, Car, Layers, MessageCircle } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'

export default async function HikeDetailPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  const [d, session] = await Promise.all([getDictionary(lang), getServerSession(authOptions)])

  const hike = await prisma.hike.findUnique({
    where: { id },
    include: {
      participants: {
        select: { id: true, userId: true, status: true, guestName: true, bringsCar: true, carSeats: true, carDriverParticipantId: true, user: { select: { name: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      photos: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!hike) notFound()

  const bankAccounts = await prisma.bankAccount.findMany({ where: { isActive: true } })

  let userParticipation = null
  if (session?.user?.id) {
    userParticipation = await prisma.hikeParticipant.findUnique({
      where: { hikeId_userId: { hikeId: id, userId: session.user.id } },
    })
  }

  const confirmedCount = hike.participants.filter(p => p.status === 'confirmed').length
  const waitlistCount = hike.participants.filter(p => p.status === 'waitlist').length
  const spotsLeft = hike.maxParticipants - confirmedCount
  const isFull = spotsLeft <= 0
  const isUpcoming = hike.status === 'upcoming'
  const entryFee = Number(hike.entryFee)
  const photos = hike.photos.map(p => ({ ...p, createdAt: p.createdAt.toISOString() }))

  const drivers = hike.participants
    .filter(p => p.bringsCar && p.carSeats !== null && (p.status === 'confirmed' || p.status === 'pending'))
    .map(p => ({
      participantId: p.id,
      driverName: p.user.name ?? '?',
      carSeats: p.carSeats!,
      passengers: hike.participants
        .filter(q => q.carDriverParticipantId === p.id)
        .map(q => ({ participantId: q.id, name: q.user.name ?? '?' })),
    }))

  const dd = d.hikeDetail
  const difficultyLabels = dd.difficulty as Record<string, string>
  const statusLabels = dd.status as Record<string, string>
  const dateLocale = d.locale

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="w-full h-72 sm:h-96 rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-emerald-800 to-stone-700 relative">
        {hike.coverImageUrl ? (
          <img src={hike.coverImageUrl} alt={hike.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Mountain size={64} className="text-white/20" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-stone-900 mb-2">{hike.title}</h1>
            <p className="text-xl text-stone-500 flex items-center gap-1">
              <MapPin size={18} /> {hike.destination}
            </p>
            {hike.mountainRange && (
              <p className="text-stone-400 flex items-center gap-1 mt-1">
                <Layers size={15} /> {hike.mountainRange}
              </p>
            )}
          </div>

          {hike.description && <p className="text-stone-700 leading-relaxed text-lg">{hike.description}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard icon={<Mountain size={18} />} label={dd.difficultyLabel}>
              {hike.difficulty
                ? <span className={difficultyColor(hike.difficulty) + ' px-2 py-0.5 rounded-full text-xs font-semibold'}>{difficultyLabels[hike.difficulty] ?? hike.difficulty}</span>
                : dd.notSet}
            </InfoCard>
            <InfoCard icon={<Calendar size={18} />} label={dd.dateLabel}>
              {new Date(hike.date).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
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
              {confirmedCount}/{hike.maxParticipants} {dd.confirmed}
              {waitlistCount > 0 && <span className="text-stone-400 text-sm ml-1">· {waitlistCount} {dd.onWaitlist}</span>}
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

          <div>
            <h2 className="text-2xl font-bold text-stone-900 mb-4">{dd.participantsSectionTitle}</h2>
            {(() => {
              const confirmed = hike.participants.filter(p => p.status === 'confirmed')
              const pendingCount = hike.participants.filter(p => p.status === 'pending').length
              const wlCount = hike.participants.filter(p => p.status === 'waitlist').length
              return (
                <>
                  {confirmed.length === 0 ? (
                    <p className="text-stone-400 text-sm">{dd.noConfirmedYet}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 sm:gap-2">
                      {confirmed.map((p, i) => (
                        <span key={i} className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1.5 rounded-full">
                          {p.user.name}{p.guestName && <span className="text-emerald-600 font-normal"> + {p.guestName}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  {(pendingCount > 0 || wlCount > 0) && (
                    <p className="text-stone-400 text-xs mt-2">
                      {pendingCount > 0 && `${pendingCount} ${dd.pendingCount}`}
                      {pendingCount > 0 && wlCount > 0 && ' · '}
                      {wlCount > 0 && `${wlCount} ${dd.waitlistCount}`}
                    </p>
                  )}
                </>
              )
            })()}
          </div>

          {hike.hasCamping && (hike.campingDetails || hike.campingPrice) && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                <Tent size={16} /> {dd.campingTitle}
              </h3>
              {hike.campingDetails && <p className="text-amber-700 text-sm">{hike.campingDetails}</p>}
              {hike.campingPrice && (
                <div className="bg-white rounded-lg p-3 inline-block text-center">
                  <div className="text-lg font-bold text-amber-800">{Number(hike.campingPrice)} RON</div>
                  <div className="text-xs text-amber-500 mt-0.5">{dd.campingCost}</div>
                </div>
              )}
            </div>
          )}

          {hike.hasAccommodation && (hike.accommodationDetails || hike.accommodationPrice) && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                <Hotel size={16} /> {dd.accommodationTitle}
              </h3>
              {hike.accommodationDetails && (
                <p className="text-blue-700 text-sm">{hike.accommodationDetails}</p>
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
            </div>
          )}

          {isUpcoming && drivers.length > 0 && (
            <CarpoolSection
              hikeId={hike.id}
              drivers={drivers}
              userParticipantId={userParticipation?.id ?? null}
              userDriverParticipantId={userParticipation?.carDriverParticipantId ?? null}
              userIsDiver={userParticipation?.bringsCar ?? false}
              dict={dd.carpool as any}
            />
          )}

          <GpxSection approximateUrl={hike.gpxApproximateUrl} actualUrl={hike.gpxActualUrl} isCompleted={hike.status === 'completed'} dict={d.gpx} />

          {photos.length > 0 && (
            <div>
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
        </div>

        <div className="space-y-4">
          {isUpcoming && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-emerald-700">
                  {entryFee > 0 ? `${entryFee} RON` : dd.free}
                </div>
                {entryFee > 0 && <p className="text-stone-400 text-sm">{dd.perPerson}</p>}
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
                dict={d.joinButton}
                lang={lang}
              />
            </div>
          )}

          {hike.whatsappGroupUrl && userParticipation?.status === 'confirmed' && (
            <a href={hike.whatsappGroupUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-2xl transition-colors">
              <MessageCircle size={18} /> {dd.joinWhatsApp}
            </a>
          )}

          {entryFee > 0 && bankAccounts.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <DollarSign size={16} /> {dd.paymentTitle}
              </h3>
              <p className="text-amber-700 text-sm mb-4">
                {dd.paymentDesc.replace('{fee}', String(entryFee))}
              </p>
              {bankAccounts.map(account => (
                <div key={account.id} className="bg-white rounded-xl p-4 mb-3 last:mb-0 border border-amber-100">
                  <div className="font-semibold text-stone-800">{account.bankName}</div>
                  <div className="text-stone-600 text-sm">{account.accountHolder}</div>
                  <div className="font-mono text-sm mt-1 text-stone-700 break-all">{account.iban}</div>
                  {account.notes && <p className="text-stone-400 text-xs mt-1">{account.notes}</p>}
                </div>
              ))}
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
    moderate: 'text-yellow-700 bg-yellow-100',
    hard: 'text-orange-700 bg-orange-100',
    expert: 'text-red-700 bg-red-100',
  }
  return m[d] ?? ''
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-100 rounded-xl p-4">
      <div className="flex items-center gap-2 text-stone-400 text-xs font-medium uppercase tracking-wide mb-1">{icon} {label}</div>
      <div className="text-stone-800 font-medium">{children}</div>
    </div>
  )
}
