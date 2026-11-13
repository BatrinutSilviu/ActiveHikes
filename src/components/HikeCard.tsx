import { Tent, Hotel } from 'lucide-react'
import type { Hike } from '@prisma/client'
import EventCard, { CARD_DATE_LOCALE } from '@/components/events/EventCard'
import { DATE_SHORT, formatHikeDate, isPastEvent } from '@/lib/dates'
import { formatRon, priceOrFree } from '@/lib/money'

type HikeCardData = {
  id: string
  title: string
  destination: string
  date: string
  endDate: string | null
  entryFee: number
  maxParticipants: number
  durationHours: number | null
  hasCamping: boolean
  hasAccommodation: boolean
  accommodationPrice: number | null
  accommodationDeposit: number | null
  difficulty: string | null
  status: string
  coverImageUrl: string | null
  confirmedCount: number
  waitlistCount: number
}

type HikeCardDict = {
  full: string
  went: string
  free: string
  camping: string
  accommodation: string
  onWaitlist: string
  totalPriceShort: string
  difficulty: Record<string, string>
  status: Record<string, string>
}

const DIFFICULTY_TEXT: Record<string, string> = {
  easy: 'text-green-600',
  easy_medium: 'text-lime-600',
  medium: 'text-amber-600',
  medium_hard: 'text-orange-600',
  hard: 'text-red-600',
}

/** Serializable card data from a hike row with its participants' statuses. */
export function toHikeCardData(hike: Hike & { participants: { status: string }[] }): HikeCardData {
  return {
    id: hike.id,
    title: hike.title,
    destination: hike.destination,
    date: hike.date.toISOString(),
    endDate: hike.endDate ? hike.endDate.toISOString() : null,
    entryFee: Number(hike.entryFee),
    maxParticipants: hike.maxParticipants,
    durationHours: hike.durationHours ? Number(hike.durationHours) : null,
    hasCamping: hike.hasCamping,
    hasAccommodation: hike.hasAccommodation,
    accommodationPrice: hike.accommodationPrice ? Number(hike.accommodationPrice) : null,
    accommodationDeposit: hike.accommodationDeposit ? Number(hike.accommodationDeposit) : null,
    difficulty: hike.difficulty,
    status: hike.status,
    coverImageUrl: hike.coverImageUrl,
    confirmedCount: hike.participants.filter(p => p.status === 'confirmed').length,
    waitlistCount: hike.participants.filter(p => p.status === 'waitlist').length,
  }
}

export default function HikeCard({ hike, lang, dict }: { hike: HikeCardData; lang: string; dict: HikeCardDict }) {
  const accommodationPrice = hike.hasAccommodation && hike.accommodationPrice ? hike.accommodationPrice : 0
  const accommodationDeposit = hike.hasAccommodation && hike.accommodationDeposit ? hike.accommodationDeposit : 0
  // What confirms a spot (entry fee + deposit) vs. the full price including the rest of the accommodation.
  const confirmationPrice = hike.entryFee + accommodationDeposit
  const totalPrice = hike.entryFee + accommodationPrice

  return (
    <EventCard
      href={`/${lang}/hikes/${hike.id}`}
      title={hike.title}
      location={hike.destination}
      coverImageUrl={hike.coverImageUrl}
      priceLabel={priceOrFree(confirmationPrice, dict.free)}
      status={hike.status}
      statusLabel={dict.status[hike.status] ?? hike.status}
      difficulty={hike.difficulty
        ? { label: dict.difficulty[hike.difficulty] ?? hike.difficulty, className: DIFFICULTY_TEXT[hike.difficulty] }
        : null}
      amenities={(hike.hasCamping || hike.hasAccommodation) && (
        // Sits under the price badge; camping wins when a hike offers both.
        <div className="absolute top-3.5 right-3.5 flex flex-col gap-1.5 items-end" style={{ top: '3.25rem' }}>
          {hike.hasCamping && (
            <span className="bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1 font-medium">
              <Tent size={11} /> {dict.camping}
            </span>
          )}
          {hike.hasAccommodation && !hike.hasCamping && (
            <span className="bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1 font-medium">
              <Hotel size={11} /> {dict.accommodation}
            </span>
          )}
        </div>
      )}
      priceNote={hike.hasAccommodation && totalPrice > confirmationPrice && (
        <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold mb-2">
          <Hotel size={12} /> {dict.totalPriceShort}: {formatRon(totalPrice)}
        </div>
      )}
      dateLabel={formatHikeDate(hike.date, hike.endDate, CARD_DATE_LOCALE[lang] ?? 'ro-RO', DATE_SHORT)}
      durationHours={hike.durationHours}
      isUpcoming={!isPastEvent(hike.status, hike.date, hike.endDate)}
      confirmedCount={hike.confirmedCount}
      maxParticipants={hike.maxParticipants}
      waitlistCount={hike.waitlistCount}
      dict={dict}
    />
  )
}
