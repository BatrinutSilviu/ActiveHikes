import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import JoinButton from '@/components/hikes/JoinButton'
import SpotsCounterVF from '@/components/viaFerrata/SpotsCounterVF'
import ParticipantsCountVF from '@/components/viaFerrata/ParticipantsCountVF'
import EssentialsSection from '@/components/hikes/EssentialsSection'
import DocumentsSection from '@/components/viaFerrata/DocumentsSection'
import { Calendar, MapPin, Users, Clock, DollarSign, Mountain, ExternalLink, Car, Navigation, Layers, MessageCircle } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { expireOverduePending } from '@/lib/expireParticipants'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'

export default async function ViaFerrataDetailPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  await Promise.all([expireOverduePending(), advanceEventStatuses()])

  const [d, session] = await Promise.all([getDictionary(lang), getServerSession(authOptions)])

  const viaFerrata = await prisma.hike.findFirst({
    where: { id, type: 'via_ferrata' },
    include: {
      participants: {
        select: { id: true, userId: true, status: true, friendName: true, hostParticipantId: true, user: { select: { name: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      documents: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!viaFerrata) notFound()

  const isAdmin = session?.user?.role === 'admin'
  if (viaFerrata.status === 'draft' && !isAdmin) notFound()

  const bankAccounts = await prisma.bankAccount.findMany({ where: { isActive: true } })

  let userParticipation = null
  if (session?.user?.id) {
    userParticipation = await prisma.hikeParticipant.findUnique({
      where: { hikeId_userId: { hikeId: id, userId: session.user.id } },
      include: { friend: { select: { id: true, friendName: true } } },
    })
  }
  const hasFriend = !!userParticipation?.friend
  const priceMultiplier = hasFriend ? 2 : 1

  const confirmedCount = viaFerrata.participants.filter(p => p.status === 'confirmed').length
  const waitlistParticipants = viaFerrata.participants.filter(p => p.status === 'waitlist')
  const waitlistCount = waitlistParticipants.length
  const userWaitlistPosition = userParticipation?.status === 'waitlist'
    ? waitlistParticipants.findIndex(p => p.userId === session?.user?.id) + 1
    : null
  const spotsLeft = viaFerrata.maxParticipants - confirmedCount
  const isFull = spotsLeft <= 0
  const isUpcoming = viaFerrata.status === 'upcoming' || (viaFerrata.status === 'draft' && isAdmin)
  const totalPrice = viaFerrata.accommodationPrice ? Number(viaFerrata.accommodationPrice) : 0
  const advanceFee = viaFerrata.accommodationDeposit ? Number(viaFerrata.accommodationDeposit) : 0
  const confirmationPrice = advanceFee
  const displayConfirmationPrice = confirmationPrice * priceMultiplier
  const displayTotalPrice = totalPrice * priceMultiplier

  const dd = d.viaFerrataDetail
  const hd = d.hikeDetail
  const dateLocale = d.locale

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="w-full h-72 sm:h-[28rem] rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-emerald-900 to-stone-800 relative shadow-xl">
        {viaFerrata.coverImageUrl && viaFerrata.coverImageUrl2 ? (
          <div className="absolute inset-0 flex">
            <img src={viaFerrata.coverImageUrl} alt={viaFerrata.title} className="w-1/2 h-full object-cover" />
            <img src={viaFerrata.coverImageUrl2} alt={viaFerrata.title} className="w-1/2 h-full object-cover" />
          </div>
        ) : viaFerrata.coverImageUrl || viaFerrata.coverImageUrl2 ? (
          <img src={viaFerrata.coverImageUrl ?? viaFerrata.coverImageUrl2 ?? undefined} alt={viaFerrata.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Mountain size={72} className="text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-8 pb-6 sm:pb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-1 leading-tight drop-shadow">{viaFerrata.title}</h1>
          <p className="text-stone-300 flex items-center gap-1.5 text-base">
            <MapPin size={15} /> {viaFerrata.destination}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="order-1 lg:col-start-1 lg:col-span-2 lg:row-start-1 space-y-8">
          {viaFerrata.description && <p className="text-stone-700 leading-relaxed text-lg whitespace-pre-wrap">{viaFerrata.description}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard icon={<Calendar size={18} />} label={dd.dateLabel}>
              {new Date(viaFerrata.date).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </InfoCard>
            <InfoCard icon={<Clock size={18} />} label={dd.durationLabel}>
              {viaFerrata.durationHours ? `${Number(viaFerrata.durationHours)} ${dd.durationUnit}` : dd.notSet}
            </InfoCard>
            <InfoCard icon={<Clock size={18} />} label={hd.meetingTimeLabel}>
              {viaFerrata.meetingTime ?? dd.notSet}
            </InfoCard>
            <InfoCard icon={<Car size={18} />} label={hd.meetingPointLabel}>
              {viaFerrata.meetingPoint ?? dd.notSet}
            </InfoCard>
            <InfoCard icon={<Navigation size={18} />} label={hd.startingPointLabel}>
              {viaFerrata.startingPoint ?? dd.notSet}
            </InfoCard>
            <InfoCard icon={<Layers size={18} />} label={dd.groupCountLabel}>
              {viaFerrata.groupCount ?? dd.notSet}
            </InfoCard>
            <InfoCard icon={<Users size={18} />} label={dd.participantsLabel}>
              {isUpcoming ? (
                <ParticipantsCountVF
                  viaFerrataId={viaFerrata.id}
                  initial={{ confirmedCount, maxParticipants: viaFerrata.maxParticipants, waitlistCount }}
                  dict={{ confirmed: dd.confirmed, onWaitlist: dd.onWaitlist }}
                />
              ) : (
                <>
                  {confirmedCount}/{viaFerrata.maxParticipants} {dd.confirmed}
                  {waitlistCount > 0 && <span className="text-stone-400 text-sm ml-1">· {waitlistCount} {dd.onWaitlist}</span>}
                </>
              )}
            </InfoCard>
            <InfoCard icon={<DollarSign size={18} />} label={dd.priceLabel}>
              {confirmationPrice > 0 ? `${confirmationPrice} RON` : dd.free}
            </InfoCard>
          </div>
        </div>

        {isUpcoming && (
          <div className="order-2 lg:col-start-3 lg:row-start-1 self-start bg-white border border-stone-100 rounded-3xl p-6 shadow-md">
            <div className="text-center mb-5">
              {totalPrice > confirmationPrice ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900">{displayTotalPrice} RON</div>
                    <div className="text-stone-400 text-[11px] uppercase tracking-wide mt-1">{hd.totalPriceLabel}</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700">{displayConfirmationPrice} RON</div>
                    <div className="text-stone-400 text-[11px] uppercase tracking-wide mt-1">{hd.confirmationPriceLabel}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-4xl font-black tracking-tight text-stone-900">
                    {displayConfirmationPrice > 0 ? `${displayConfirmationPrice} RON` : dd.free}
                  </div>
                  {displayConfirmationPrice > 0 && (
                    <p className="text-stone-400 text-sm mt-1">{hasFriend ? dd.forYouAndFriend : dd.perPerson}</p>
                  )}
                </>
              )}
              {hasFriend && (
                <p className="text-emerald-600 text-xs font-medium mt-2 leading-relaxed">{dd.friendDoublesFee}</p>
              )}
            </div>

            <SpotsCounterVF
              viaFerrataId={viaFerrata.id}
              initial={{ confirmedCount, maxParticipants: viaFerrata.maxParticipants, spotsLeft, isFull, waitlistCount }}
              dict={d.spots}
            />

            <JoinButton
              hikeId={viaFerrata.id}
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

        <div className="order-4 lg:col-start-1 lg:col-span-2 lg:row-start-2 space-y-8">
          <Link
            href={`/${lang}/via-ferrata/${viaFerrata.id}/carpool`}
            className="flex items-center justify-between gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-4 font-semibold shadow-sm transition-colors"
          >
            <span className="flex items-center gap-2">
              <Car size={18} /> {hd.participantsSectionTitle}
            </span>
            <ExternalLink size={15} className="text-white/70" />
          </Link>

          <EssentialsSection items={viaFerrata.essentials} title={dd.routesTitle} />
          <DocumentsSection documents={viaFerrata.documents} title={dd.documentsTitle} hint={dd.documentsHint} />
        </div>

        <div className="order-3 lg:col-start-3 lg:row-start-2 self-start space-y-4">
          {viaFerrata.whatsappGroupUrl && userParticipation?.status === 'confirmed' && (
            <a href={viaFerrata.whatsappGroupUrl} target="_blank" rel="noopener noreferrer"
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
                {dd.paymentDesc.replace('{fee}', String(displayConfirmationPrice))}
              </p>
              {hasFriend && (
                <p className="text-amber-600 text-xs font-medium bg-amber-100/70 rounded-lg px-3 py-2 mb-4">
                  {dd.friendDoublesFee}
                </p>
              )}
              {totalPrice > confirmationPrice && (
                <p className="text-amber-600 text-xs font-medium bg-amber-100/70 rounded-lg px-3 py-2 mb-4">
                  {dd.remainingNote}
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
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-stone-950/[0.04]">
      <div className="flex items-center gap-1.5 text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">{icon} {label}</div>
      <div className="text-stone-900 font-semibold text-sm leading-snug">{children}</div>
    </div>
  )
}
