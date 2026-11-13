import { DollarSign } from 'lucide-react'
import type { Hike } from '@prisma/client'
import EventCard, { CARD_DATE_LOCALE } from '@/components/events/EventCard'
import { DATE_SHORT, formatHikeDate, isPastEvent } from '@/lib/dates'
import { formatRon, priceOrFree } from '@/lib/money'
import { getConfirmationPrice } from '@/lib/pricing'

type GeneralEventCardData = {
  id: string
  title: string
  location: string
  category: string | null
  date: string
  endDate: string | null
  startTime: string | null
  price: number
  confirmationPrice: number
  maxParticipants: number
  durationHours: number | null
  status: string
  confirmedCount: number
  waitlistCount: number
  coverImageUrl: string | null
}

type GeneralEventCardDict = {
  full: string
  went: string
  free: string
  onWaitlist: string
  totalPriceShort: string
  status: Record<string, string>
}

/** Serializable card data from a general event's row. */
export function toGeneralEventCardData(event: Hike & { participants: { status: string }[] }): GeneralEventCardData {
  return {
    id: event.id,
    title: event.title,
    location: event.destination,
    category: event.category,
    date: event.date.toISOString(),
    endDate: event.endDate?.toISOString() ?? null,
    startTime: event.meetingTime,
    price: Number(event.entryFee),
    confirmationPrice: getConfirmationPrice(event),
    maxParticipants: event.maxParticipants,
    durationHours: event.durationHours ? Number(event.durationHours) : null,
    status: event.status,
    confirmedCount: event.participants.filter(p => p.status === 'confirmed').length,
    waitlistCount: event.participants.filter(p => p.status === 'waitlist').length,
    coverImageUrl: event.coverImageUrl,
  }
}

export default function GeneralEventCard({ event, lang, dict }: { event: GeneralEventCardData; lang: string; dict: GeneralEventCardDict }) {
  const date = formatHikeDate(event.date, event.endDate, CARD_DATE_LOCALE[lang] ?? 'ro-RO', DATE_SHORT)
  return (
    <EventCard
      href={`/${lang}/events/${event.id}`}
      title={event.title}
      location={event.location}
      coverImageUrl={event.coverImageUrl}
      priceLabel={priceOrFree(event.confirmationPrice, dict.free)}
      status={event.status}
      statusLabel={dict.status[event.status] ?? event.status}
      difficulty={event.category ? { label: event.category, className: 'text-violet-700' } : null}
      priceNote={event.price > event.confirmationPrice && (
        <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold mb-2">
          <DollarSign size={12} /> {dict.totalPriceShort}: {formatRon(event.price)}
        </div>
      )}
      dateLabel={event.startTime ? `${date} · ${event.startTime}` : date}
      durationHours={event.durationHours}
      isUpcoming={!isPastEvent(event.status, event.date, event.endDate)}
      confirmedCount={event.confirmedCount}
      maxParticipants={event.maxParticipants}
      waitlistCount={event.waitlistCount}
      dict={dict}
    />
  )
}
