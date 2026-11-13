import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ParticipantManager from '@/components/admin/ParticipantManager'
import WhatsAppGroupCompare from '@/components/admin/WhatsAppGroupCompare'
import EventForm from '@/components/generalEvents/EventForm'
import { eventCategories } from '@/lib/eventCategories'
import EventChat from '@/components/generalEvents/EventChat'
import { AdminEventHeader, AdminRegistrationCard, StatusCountsGrid } from '@/components/admin/AdminEventParts'
import { toRegistration } from '@/components/events/join/registration'
import { DATE_LONG, formatHikeDate, isEventPast } from '@/lib/dates'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { waitlistOverduePending } from '@/lib/expireParticipants'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'
import { participantStats, waitlistPosition } from '@/lib/participantStats'
import { managedParticipantInclude, toManagedParticipant } from '@/lib/adminParticipants'

// Managing a general event: its participants, its details, the organisers' own registration and its chat.
export default async function AdminGeneralEventPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  await Promise.all([waitlistOverduePending(), advanceEventStatuses()])

  const [d, session, event, bankAccounts] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    prisma.hike.findFirst({
      where: { id, type: 'event' },
      include: {
        participants: { include: managedParticipantInclude, orderBy: { joinedAt: 'asc' } },
        bankAccounts: { where: { isActive: true }, select: { id: true } },
      },
    }),
    prisma.bankAccount.findMany({ where: { isActive: true }, select: { id: true, type: true, bankName: true, accountHolder: true } }),
  ])
  if (!event) notFound()

  const da = d.admin.viaFerrata
  const de = d.events.admin
  const adminParticipation = session?.user?.id ? event.participants.find(p => p.userId === session.user.id) ?? null : null
  const { waitlistCount, isFull } = participantStats(event.participants, event.maxParticipants)
  const participants = event.participants.map(toManagedParticipant)
  const timing = event.meetingTime ? ` · ${[event.meetingTime, event.endTime].filter(Boolean).join('–')}` : ''

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <AdminEventHeader
        lang={lang}
        title={event.title}
        subtitle={`${event.category ? `${event.category} · ` : ''}${event.destination} · ${formatHikeDate(event.date, event.endDate, d.locale, DATE_LONG)}${timing}`}
        publicUrl={`/${lang}/events/${event.id}`}
        statusControl={{ hikeId: event.id, status: event.status, isPast: isEventPast(event.date, event.endDate, event), dict: d.admin.hikeStatus }}
        dict={da}
      />

      <StatusCountsGrid participants={event.participants} labels={da.status as Record<string, string>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4">{da.participantsTitle}</h2>
            <ParticipantManager participants={participants} hikeId={event.id} maxParticipants={event.maxParticipants} dict={da} />
          </div>
          <WhatsAppGroupCompare
            eventId={event.id}
            participants={participants}
            adminUserId={session?.user?.id ?? null}
            statusLabels={da.status as Record<string, string>}
            dict={{ ...d.admin.whatsappCompare, copyPhone: da.copyPhone, phoneCopied: da.phoneCopied, openWhatsApp: da.openWhatsApp }}
          />
          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4">{de.chatTitle}</h2>
            <EventChat eventId={event.id} userId={session?.user?.id ?? null} isAdmin lang={lang} locale={d.locale} dict={d.events.chat} />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4">{de.editTitle}</h2>
            <EventForm
              event={{
                id: event.id,
                title: event.title,
                category: event.category,
                place: event.destination,
                address: event.meetingPoint,
                description: event.description,
                date: event.date.toISOString(),
                endDate: event.endDate?.toISOString() ?? null,
                startTime: event.meetingTime,
                endTime: event.endTime,
                maxParticipants: event.maxParticipants,
                price: Number(event.entryFee),
                advanceFee: event.advanceFee != null ? Number(event.advanceFee) : null,
                whatToBring: event.essentials,
                whatsappGroupUrl: event.whatsappGroupUrl,
                coverImageUrl: event.coverImageUrl,
                bankAccountIds: event.bankAccounts.map(a => a.id),
              }}
              bankAccounts={bankAccounts}
              categories={await eventCategories()}
              lang={lang}
              dict={de.form}
            />
          </div>

          <AdminRegistrationCard
            title={da.myRegistration}
            hikeId={event.id}
            userId={session?.user?.id ?? null}
            isFull={isFull}
            registration={toRegistration(adminParticipation)}
            waitlistPosition={waitlistPosition(event.participants, session?.user?.id, adminParticipation?.status)}
            waitlistCount={waitlistCount}
            dict={d.joinButton}
            tripDict={d.carTrip}
            lang={lang}
            withCar={false}
          />
        </div>
      </div>
    </div>
  )
}
