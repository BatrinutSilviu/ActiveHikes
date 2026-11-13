import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { Calendar, Clock, DollarSign, MapPin, Tag, Users } from 'lucide-react'
import JoinButton from '@/components/events/join/JoinButton'
import { toRegistration } from '@/components/events/join/registration'
import SpotsCounter from '@/components/events/SpotsCounter'
import ParticipantsCount from '@/components/events/ParticipantsCount'
import ParticipantsLine from '@/components/events/ParticipantsLine'
import { AdminPreviewBar, EventHero, InfoCard, WhatsAppGroupLink } from '@/components/events/EventDetail'
import { PaymentInstructions, PriceSummary } from '@/components/events/EventPayment'
import EssentialsSection from '@/components/hikes/EssentialsSection'
import EventChat from '@/components/generalEvents/EventChat'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { waitlistOverduePending } from '@/lib/expireParticipants'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'
import { getConfirmationPrice } from '@/lib/pricing'
import { DATE_LONG_WITH_WEEKDAY, formatHikeDate } from '@/lib/dates'
import { priceOrFree } from '@/lib/money'
import { participantStats, waitlistPosition } from '@/lib/participantStats'
import { spotsApiUrl } from '@/lib/eventPaths'

// A general event (a run, a workshop, a party…): its details, signing up, paying, and its chat.
export default async function GeneralEventPage({ params, searchParams }: {
  params: Promise<{ lang: string; id: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { lang, id } = await params
  const { preview } = await searchParams
  if (!hasLocale(lang)) notFound()

  await Promise.all([waitlistOverduePending(), advanceEventStatuses()])
  const [d, session] = await Promise.all([getDictionary(lang), getServerSession(authOptions)])

  const event = await prisma.hike.findFirst({
    where: { id, type: 'event' },
    include: {
      participants: {
        select: { id: true, userId: true, status: true, friendName: true, hostParticipantId: true, user: { select: { name: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      bankAccounts: { where: { isActive: true } },
    },
  })
  if (!event) notFound()

  const isAdmin = session?.user?.role === 'admin'
  if (event.status === 'draft' && !isAdmin) notFound()
  const isPreviewMode = isAdmin && preview === '1'

  const userParticipation = session?.user?.id
    ? await prisma.hikeParticipant.findUnique({
        where: { hikeId_userId: { hikeId: id, userId: session.user.id } },
        include: { friend: { select: { id: true, friendName: true } } },
      })
    : null
  const showsAsConfirmed = isPreviewMode || userParticipation?.status === 'confirmed'
  const hasFriend = !!userParticipation?.friend
  const priceMultiplier = hasFriend ? 2 : 1

  const { confirmedCount, waitlistCount, spotsLeft, isFull } = participantStats(event.participants, event.maxParticipants)
  const userWaitlistPosition = waitlistPosition(event.participants, session?.user?.id, userParticipation?.status)
  const isUpcoming = event.status === 'upcoming' || (event.status === 'draft' && isAdmin)
  const totalPrice = Number(event.entryFee)
  const confirmationPrice = getConfirmationPrice(event)

  const dd = d.viaFerrataDetail
  const de = d.events.detail
  const counts = { confirmedCount, maxParticipants: event.maxParticipants, waitlistCount }
  const countsDict = { confirmed: dd.confirmed, onWaitlist: dd.onWaitlist }
  const time = [event.meetingTime, event.endTime].filter(Boolean).join(' – ')
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.meetingPoint, event.destination].filter(Boolean).join(', '))}`

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <AdminPreviewBar isAdmin={isAdmin} isPreviewMode={isPreviewMode} eventUrl={`/${lang}/events/${event.id}`} dict={dd} />
      <EventHero title={event.title} destination={event.destination} coverImageUrl={event.coverImageUrl} coverImageUrl2={event.coverImageUrl2} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="order-1 lg:col-start-1 lg:col-span-2 lg:row-start-1 space-y-8">
          {event.description && <p className="text-stone-700 leading-relaxed text-lg whitespace-pre-wrap">{event.description}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard icon={<Calendar size={18} />} label={dd.dateLabel}>
              {formatHikeDate(event.date, event.endDate, d.locale, DATE_LONG_WITH_WEEKDAY)}
            </InfoCard>
            <InfoCard icon={<Clock size={18} />} label={de.timeLabel}>
              {time || dd.notSet}
            </InfoCard>
            <InfoCard icon={<MapPin size={18} />} label={de.placeLabel}>
              <span className="block">{event.destination}</span>
              {event.meetingPoint && <span className="block text-sm text-stone-500 font-normal">{event.meetingPoint}</span>}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-700 font-semibold underline">{de.openInMaps}</a>
            </InfoCard>
            {event.category && (
              <InfoCard icon={<Tag size={18} />} label={de.kindLabel}>{event.category}</InfoCard>
            )}
            <InfoCard icon={<Users size={18} />} label={dd.participantsLabel}>
              {isUpcoming
                ? <ParticipantsCount spotsUrl={spotsApiUrl('event', event.id)} initial={counts} dict={countsDict} />
                : <ParticipantsLine counts={counts} dict={countsDict} />}
            </InfoCard>
            <InfoCard icon={<DollarSign size={18} />} label={dd.priceLabel}>
              {priceOrFree(totalPrice, dd.free)}
              {confirmationPrice < totalPrice && (
                <span className="block text-sm text-stone-500 font-normal">
                  {de.advanceNote.replace('{advance}', String(confirmationPrice)).replace('{rest}', String(totalPrice - confirmationPrice))}
                </span>
              )}
            </InfoCard>
          </div>
        </div>

        {isUpcoming && (
          <div className="order-2 lg:col-start-3 lg:row-start-1 self-start bg-white border border-stone-100 rounded-3xl p-6 shadow-md">
            <PriceSummary
              totalPrice={totalPrice}
              confirmationPrice={confirmationPrice}
              priceMultiplier={priceMultiplier}
              hasFriend={hasFriend}
              dict={{ ...dd, totalPriceLabel: d.hikeDetail.totalPriceLabel, confirmationPriceLabel: d.hikeDetail.confirmationPriceLabel }}
            />
            <SpotsCounter spotsUrl={spotsApiUrl('event', event.id)} initial={{ ...counts, spotsLeft, isFull }} dict={d.spots} />
            <JoinButton
              hikeId={event.id}
              userId={session?.user?.id ?? null}
              isFull={isFull}
              registration={toRegistration(userParticipation)}
              waitlistPosition={userWaitlistPosition}
              waitlistCount={waitlistCount}
              dict={d.joinButton}
              tripDict={d.carTrip}
              lang={lang}
              withCar={false}
            />
          </div>
        )}

        <div className="order-4 lg:col-start-1 lg:col-span-2 lg:row-start-2 space-y-8">
          <EssentialsSection items={event.essentials} title={de.whatToBring} />
          <EventChat
            // A new key when the viewer signs up or leaves, so the chat loads again with their access.
            key={userParticipation?.status ?? 'none'}
            eventId={event.id}
            userId={session?.user?.id ?? null}
            isAdmin={isAdmin}
            lang={lang}
            locale={d.locale}
            dict={d.events.chat}
          />
        </div>

        <div className="order-3 lg:col-start-3 lg:row-start-2 self-start space-y-4">
          {event.whatsappGroupUrl && showsAsConfirmed && <WhatsAppGroupLink url={event.whatsappGroupUrl} label={dd.joinWhatsApp} />}
          {confirmationPrice > 0 && event.bankAccounts.length > 0 && (
            <PaymentInstructions
              accounts={event.bankAccounts}
              amount={confirmationPrice * priceMultiplier}
              hasFriend={hasFriend}
              note={totalPrice > confirmationPrice ? dd.remainingNote : null}
              dict={dd}
            />
          )}
        </div>
      </div>
    </div>
  )
}
