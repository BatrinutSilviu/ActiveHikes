// The card used in event listings; HikeCard and ViaFerrataCard fill it in.
import Link from 'next/link'
import { Calendar, Users, Clock, ChevronRight, Mountain, MapPin } from 'lucide-react'
import UploadedImage from '@/components/UploadedImage'

const STATUS_TEXT: Record<string, string> = {
  upcoming: 'text-emerald-600',
  ongoing: 'text-blue-600',
  completed: 'text-stone-500',
  cancelled: 'text-red-500',
}

/** A small pill over the cover photo (status, difficulty). */
export type CardBadge = { label: string; className: string | undefined }

export default function EventCard({
  href,
  title,
  location,
  coverImageUrl,
  priceLabel,
  status,
  statusLabel,
  difficulty,
  amenities,
  priceNote,
  dateLabel,
  durationHours,
  isUpcoming,
  confirmedCount,
  maxParticipants,
  waitlistCount,
  dict,
}: {
  href: string
  title: string
  location: string
  coverImageUrl: string | null
  priceLabel: string
  status: string
  statusLabel: string
  difficulty?: CardBadge | null
  /** Extra badges under the price (camping, accommodation). */
  amenities?: React.ReactNode
  /** Line above the date, e.g. the full price when only an advance is due upfront. */
  priceNote?: React.ReactNode
  dateLabel: string
  durationHours: number | null
  isUpcoming: boolean
  confirmedCount: number
  maxParticipants: number
  waitlistCount: number
  dict: { full: string; went: string; onWaitlist: string }
}) {
  const isFull = maxParticipants - confirmedCount <= 0

  return (
    <Link href={href}
      className="group block bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">

      {/* Image / overlay area */}
      <div className="relative h-60 overflow-hidden">
        {coverImageUrl ? (
          <UploadedImage src={coverImageUrl} alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-emerald-800 to-stone-800 flex items-center justify-center">
            <Mountain size={56} className="text-white/10" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />

        {/* Price badge — top right */}
        <div className="absolute top-3.5 right-3.5">
          <span className="bg-white text-stone-900 font-bold text-sm px-3 py-1.5 rounded-full shadow-md">
            {priceLabel}
          </span>
        </div>

        {/* Status + difficulty — top left */}
        <div className="absolute top-3.5 left-3.5 flex gap-1.5">
          <span className={`bg-white/90 backdrop-blur-sm text-xs font-semibold px-2.5 py-1.5 rounded-full ${STATUS_TEXT[status]}`}>
            {statusLabel}
          </span>
          {difficulty && (
            <span className={`bg-white/90 backdrop-blur-sm text-xs font-semibold px-2.5 py-1.5 rounded-full ${difficulty.className}`}>
              {difficulty.label}
            </span>
          )}
        </div>

        {amenities}

        {/* Title + location overlaid on image */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-bold text-white text-lg leading-snug group-hover:text-emerald-300 transition-colors">
            {title}
          </h3>
          <p className="text-white/60 text-sm flex items-center gap-1 mt-1">
            <MapPin size={13} className="shrink-0" /> {location}
          </p>
        </div>
      </div>

      {/* Bottom info strip */}
      <div className="px-5 py-3.5">
        {priceNote}
        <div className="flex items-center justify-between">
          <div className="flex gap-3.5 text-xs text-stone-400 font-medium">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {dateLabel}
            </span>
            {durationHours && (
              <span className="flex items-center gap-1"><Clock size={12} /> {durationHours}h</span>
            )}
            <span className="flex items-center gap-1">
              <Users size={12} />
              {isUpcoming ? (
                isFull
                  ? <span className="text-red-500 font-semibold">{dict.full}</span>
                  : <span>{confirmedCount}/{maxParticipants}</span>
              ) : (
                <span>{confirmedCount} {dict.went}</span>
              )}
              {isUpcoming && waitlistCount > 0 && (
                <span className="text-stone-400">· {waitlistCount} {dict.onWaitlist}</span>
              )}
            </span>
          </div>
          <ChevronRight size={17} className="text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  )
}

/** Card dates use the full regional locale (e.g. "12 iun. 2027"). */
export const CARD_DATE_LOCALE: Record<string, string> = { en: 'en-GB', ro: 'ro-RO' }
export const CARD_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
