import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getEventManagerSession } from '@/lib/session'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'
import { DATE_LONG, formatHikeDate, isEventPast } from '@/lib/dates'
import { managedParticipantInclude, toManagedParticipant } from '@/lib/adminParticipants'
import { eventCategories } from '@/lib/eventCategories'
import ParticipantManager from '@/components/admin/ParticipantManager'
import { StatusCountsGrid } from '@/components/admin/AdminEventParts'
import EventForm from '@/components/generalEvents/EventForm'
import EventChat from '@/components/generalEvents/EventChat'
import MemberEventStatus from '@/components/events/MemberEventStatus'

// The page where a member manages an event they made (Hike.byMember): who's coming, its details,
// cancelling it, and its chat as the organiser. Admins can open it too (they also have the admin page).
export default async function ManageMemberEventPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  const manager = await getEventManagerSession(id)
  if (!manager) {
    // Signed out: sign in first. Signed in but not theirs: as if there were no such page.
    if (!(await getServerSession(authOptions))) redirect(`/${lang}/auth/login?callbackUrl=${encodeURIComponent(`/${lang}/events/${id}/manage`)}`)
    notFound()
  }

  await advanceEventStatuses()
  const [d, event] = await Promise.all([
    getDictionary(lang),
    prisma.hike.findFirst({
      where: { id, type: 'event', byMember: true },
      include: { participants: { include: managedParticipantInclude, orderBy: { joinedAt: 'asc' } } },
    }),
  ])
  if (!event) notFound()

  const dm = d.events.member
  const da = d.admin.viaFerrata
  // The organiser sees who's coming, not their email addresses or phone numbers (admins see those on
  // the admin page); they talk to them in the event's chat.
  const participants = event.participants.map(p => {
    const m = toManagedParticipant(p)
    return { ...m, user: m.user ? { ...m.user, email: null, phone: null } : null }
  })
  const timing = event.meetingTime ? ` · ${[event.meetingTime, event.endTime].filter(Boolean).join('–')}` : ''
  const isPast = isEventPast(event.date, event.endDate, event)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href={`/${lang}/profile`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {dm.myEvents}
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{dm.manageTitle}</p>
          <h1 className="text-3xl font-black tracking-tight text-stone-900 break-words">{event.title}</h1>
          <p className="text-stone-500 mt-1 text-sm">
            {event.category ? `${event.category} · ` : ''}{event.destination} · {formatHikeDate(event.date, event.endDate, d.locale, DATE_LONG)}{timing}
          </p>
        </div>
        <Link href={`/${lang}/events/${event.id}`}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline">
          {dm.viewPublic} <ExternalLink size={14} />
        </Link>
      </div>

      <div className="mb-6">
        <MemberEventStatus eventId={event.id} cancelled={event.status === 'cancelled'} isPast={isPast} dict={dm} />
      </div>

      <StatusCountsGrid participants={event.participants} labels={da.status as Record<string, string>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-1">{dm.participantsTitle}</h2>
            <p className="text-sm text-stone-500 mb-4">{dm.participantsHint}</p>
            <ParticipantManager participants={participants} hikeId={event.id} maxParticipants={event.maxParticipants} dict={da} organizer />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4">{dm.chatTitle}</h2>
            <EventChat eventId={event.id} userId={manager.session.user.id} isAdmin lang={lang} locale={d.locale} dict={d.events.chat} />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-stone-800 mb-4">{dm.editTitle}</h2>
          <EventForm
            member
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
              price: 0,
              advanceFee: null,
              whatToBring: event.essentials,
              whatsappGroupUrl: event.whatsappGroupUrl,
              coverImageUrl: event.coverImageUrl,
              bankAccountIds: [],
            }}
            {...await eventCategories()}
            lang={lang}
            dict={{ ...d.events.admin.form, categoryHint: dm.categoryHint }}
          />
        </div>
      </div>
    </div>
  )
}
