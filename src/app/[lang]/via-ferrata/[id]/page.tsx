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
import EssentialsSection from '@/components/hikes/EssentialsSection'
import DocumentsSection from '@/components/viaFerrata/DocumentsSection'
import DocumentUploadsSection from '@/components/viaFerrata/DocumentUploadsSection'
import { Calendar, Users, Clock, DollarSign, Car, Navigation, Layers } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { waitlistOverduePending } from '@/lib/expireParticipants'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'
import { getConfirmationPrice } from '@/lib/pricing'
import { priceOrFree } from '@/lib/money'
import { participantStats, waitlistPosition } from '@/lib/participantStats'
import { spotsApiUrl } from '@/lib/eventPaths'

export default async function ViaFerrataDetailPage({ params, searchParams }: {
  params: Promise<{ lang: string; id: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { lang, id } = await params
  const { preview } = await searchParams
  if (!hasLocale(lang)) notFound()

  await Promise.all([waitlistOverduePending(), advanceEventStatuses()])

  const [d, session] = await Promise.all([getDictionary(lang), getServerSession(authOptions)])

  const viaFerrata = await prisma.hike.findFirst({
    where: { id, type: 'via_ferrata' },
    include: {
      participants: {
        select: { id: true, userId: true, status: true, friendName: true, hostParticipantId: true, user: { select: { name: true } } },
        orderBy: { joinedAt: 'asc' },
      },
      documents: { orderBy: { createdAt: 'asc' } },
      bankAccounts: { where: { isActive: true } },
    },
  })
  if (!viaFerrata) notFound()

  const isAdmin = session?.user?.role === 'admin'
  if (viaFerrata.status === 'draft' && !isAdmin) notFound()

  // Admins can look at the page as a confirmed participant would see it.
  const isPreviewMode = isAdmin && preview === '1'

  const userParticipation = session?.user?.id
    ? await prisma.hikeParticipant.findUnique({
        where: { hikeId_userId: { hikeId: id, userId: session.user.id } },
        include: { friend: { select: { id: true, friendName: true } }, documentSubmissions: true },
      })
    : null
  const canSubmitDocuments = isPreviewMode
    || (!!userParticipation && userParticipation.status !== 'rejected')
  const showsAsConfirmed = isPreviewMode || userParticipation?.status === 'confirmed'
  const requiredDocumentCount = viaFerrata.documents.filter(document => document.requiresUpload).length

  // In preview mode the admin's test uploads are kept apart from real participants' ones.
  const mySubmissions = isPreviewMode
    ? await prisma.hikeDocumentSubmission.findMany({ where: { hikeId: id, previewAdminId: session!.user.id } })
    : userParticipation?.documentSubmissions ?? []
  // A friend registered alongside the user pays the same price again.
  const hasFriend = !!userParticipation?.friend
  const priceMultiplier = hasFriend ? 2 : 1

  const { confirmedCount, waitlistCount, spotsLeft, isFull } = participantStats(viaFerrata.participants, viaFerrata.maxParticipants)
  const userWaitlistPosition = waitlistPosition(viaFerrata.participants, session?.user?.id, userParticipation?.status)
  const isUpcoming = viaFerrata.status === 'upcoming' || (viaFerrata.status === 'draft' && isAdmin)
  // A Via Ferrata has no entry fee: the advance confirms the spot, the rest of the total is paid later.
  const totalPrice = viaFerrata.accommodationPrice ? Number(viaFerrata.accommodationPrice) : 0
  const confirmationPrice = getConfirmationPrice(viaFerrata)

  const dd = d.viaFerrataDetail
  const hd = d.hikeDetail
  const dateLocale = d.locale
  const counts = { confirmedCount, maxParticipants: viaFerrata.maxParticipants, waitlistCount }
  const countsDict = { confirmed: dd.confirmed, onWaitlist: dd.onWaitlist }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <AdminPreviewBar isAdmin={isAdmin} isPreviewMode={isPreviewMode} eventUrl={`/${lang}/via-ferrata/${viaFerrata.id}`} dict={dd} />
      <EventHero
        title={viaFerrata.title}
        destination={viaFerrata.destination}
        coverImageUrl={viaFerrata.coverImageUrl}
        coverImageUrl2={viaFerrata.coverImageUrl2}
      />

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
              {isUpcoming
                ? <ParticipantsCount spotsUrl={spotsApiUrl('via_ferrata', viaFerrata.id)} initial={counts} dict={countsDict} />
                : <ParticipantsLine counts={counts} dict={countsDict} />}
            </InfoCard>
            <InfoCard icon={<DollarSign size={18} />} label={dd.priceLabel}>
              {priceOrFree(confirmationPrice, dd.free)}
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
              dict={{ ...dd, totalPriceLabel: hd.totalPriceLabel, confirmationPriceLabel: hd.confirmationPriceLabel }}
            />

            <SpotsCounter
              spotsUrl={spotsApiUrl('via_ferrata', viaFerrata.id)}
              initial={{ ...counts, spotsLeft, isFull }}
              dict={d.spots}
            />

            <JoinButton
              hikeId={viaFerrata.id}
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

        <div className="order-4 lg:col-start-1 lg:col-span-2 lg:row-start-2 space-y-8">
          <CarpoolLink href={`/${lang}/via-ferrata/${viaFerrata.id}/carpool`} label={hd.participantsSectionTitle} />

          <EssentialsSection items={viaFerrata.essentials} title={dd.routesTitle} />
          <DocumentsSection
            documents={viaFerrata.documents}
            title={dd.documentsTitle}
            hint={dd.documentsHint}
          />
          {canSubmitDocuments && requiredDocumentCount > 0 && (
            <DocumentUploadsSection
              hikeId={viaFerrata.id}
              previewMode={isPreviewMode}
              submissions={mySubmissions.map(s => ({ id: s.id, url: s.url, fileName: s.fileName }))}
              maxUploads={requiredDocumentCount}
              dict={dd.documentUploads}
            />
          )}
        </div>

        <div className="order-3 lg:col-start-3 lg:row-start-2 self-start space-y-4">
          {viaFerrata.whatsappGroupUrl && showsAsConfirmed && (
            <WhatsAppGroupLink url={viaFerrata.whatsappGroupUrl} label={dd.joinWhatsApp} />
          )}

          {confirmationPrice > 0 && viaFerrata.bankAccounts.length > 0 && (
            <PaymentInstructions
              accounts={viaFerrata.bankAccounts}
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
