import { DollarSign } from 'lucide-react'
import type { Hike } from '@prisma/client'
import EventCard, { CARD_DATE_FORMAT, CARD_DATE_LOCALE } from '@/components/events/EventCard'
import { formatHikeDate, isPastEvent } from '@/lib/dates'
import { formatRon, priceOrFree } from '@/lib/money'

type ViaFerrataCardData = {
  id: string
  title: string
  location: string
  date: string
  totalPrice: number | null
  advanceFee: number | null
  maxParticipants: number
  durationHours: number | null
  status: string
  confirmedCount: number
  waitlistCount: number
  coverImageUrl: string | null
}

type ViaFerrataCardDict = {
  full: string
  went: string
  free: string
  onWaitlist: string
  totalPriceShort: string
  status: Record<string, string>
}

/**
 * Serializable card data from a Via Ferrata row. These events reuse the accommodation
 * price/deposit columns for their total price and the advance that confirms a spot.
 */
export function toViaFerrataCardData(event: Hike & { participants: { status: string }[] }): ViaFerrataCardData {
  return {
    id: event.id,
    title: event.title,
    location: event.destination,
    date: event.date.toISOString(),
    totalPrice: event.accommodationPrice ? Number(event.accommodationPrice) : null,
    advanceFee: event.accommodationDeposit ? Number(event.accommodationDeposit) : null,
    maxParticipants: event.maxParticipants,
    durationHours: event.durationHours ? Number(event.durationHours) : null,
    status: event.status,
    confirmedCount: event.participants.filter(p => p.status === 'confirmed').length,
    waitlistCount: event.participants.filter(p => p.status === 'waitlist').length,
    coverImageUrl: event.coverImageUrl,
  }
}

export default function ViaFerrataCard({ viaFerrata, lang, dict }: { viaFerrata: ViaFerrataCardData; lang: string; dict: ViaFerrataCardDict }) {
  const confirmationPrice = viaFerrata.advanceFee ?? 0
  const totalPrice = viaFerrata.totalPrice ?? 0

  return (
    <EventCard
      href={`/${lang}/via-ferrata/${viaFerrata.id}`}
      title={viaFerrata.title}
      location={viaFerrata.location}
      coverImageUrl={viaFerrata.coverImageUrl}
      priceLabel={priceOrFree(confirmationPrice, dict.free)}
      status={viaFerrata.status}
      statusLabel={dict.status[viaFerrata.status] ?? viaFerrata.status}
      priceNote={totalPrice > confirmationPrice && (
        <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold mb-2">
          <DollarSign size={12} /> {dict.totalPriceShort}: {formatRon(totalPrice)}
        </div>
      )}
      dateLabel={formatHikeDate(viaFerrata.date, null, CARD_DATE_LOCALE[lang] ?? 'ro-RO', CARD_DATE_FORMAT)}
      durationHours={viaFerrata.durationHours}
      isUpcoming={!isPastEvent(viaFerrata.status, viaFerrata.date)}
      confirmedCount={viaFerrata.confirmedCount}
      maxParticipants={viaFerrata.maxParticipants}
      waitlistCount={viaFerrata.waitlistCount}
      dict={dict}
    />
  )
}
