import Link from 'next/link'
import { Calendar, Users, Clock, Tent, Hotel, ChevronRight, Mountain, MapPin } from 'lucide-react'
import { formatHikeDate } from '@/lib/dates'

const LOCALE_MAP: Record<string, string> = { en: 'en-GB', ro: 'ro-RO' }

type HikeCardData = {
  id: string
  title: string
  destination: string
  description: string | null
  date: string
  endDate: string | null
  entryFee: number
  maxParticipants: number
  durationHours: number | null
  hasCamping: boolean
  hasAccommodation: boolean
  difficulty: string | null
  status: string
  coverImageUrl: string | null
  confirmedCount: number
  waitlistCount: number
}

type HikeCardDict = {
  full: string
  joined: string
  went: string
  viewDetails: string
  free: string
  noCoverPhoto: string
  camping: string
  accommodation: string
  onWaitlist: string
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

const STATUS_TEXT: Record<string, string> = {
  upcoming: 'text-emerald-600',
  ongoing: 'text-blue-600',
  completed: 'text-stone-500',
  cancelled: 'text-red-500',
}

export default function HikeCard({ hike, lang, dict }: { hike: HikeCardData; lang: string; dict: HikeCardDict }) {
  const spotsLeft = hike.maxParticipants - hike.confirmedCount
  const isFull = spotsLeft <= 0
  const isUpcoming = hike.status === 'upcoming'
  const priceLabel = hike.entryFee > 0 ? `${hike.entryFee} RON` : dict.free

  return (
    <Link href={`/${lang}/hikes/${hike.id}`}
      className="group block bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">

      {/* Image / overlay area */}
      <div className="relative h-60 overflow-hidden">
        {hike.coverImageUrl ? (
          <img src={hike.coverImageUrl} alt={hike.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-emerald-800 to-stone-800 flex items-center justify-center">
            <Mountain size={56} className="text-white/10" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />

        {/* Price badge — top right */}
        <div className="absolute top-3.5 right-3.5">
          <span className="bg-white text-stone-900 font-bold text-sm px-3 py-1.5 rounded-full shadow-md">
            {priceLabel}
          </span>
        </div>

        {/* Status + difficulty — top left */}
        <div className="absolute top-3.5 left-3.5 flex gap-1.5">
          <span className={`bg-white/90 backdrop-blur-sm text-xs font-semibold px-2.5 py-1.5 rounded-full ${STATUS_TEXT[hike.status]}`}>
            {dict.status[hike.status] ?? hike.status}
          </span>
          {hike.difficulty && (
            <span className={`bg-white/90 backdrop-blur-sm text-xs font-semibold px-2.5 py-1.5 rounded-full ${DIFFICULTY_TEXT[hike.difficulty]}`}>
              {dict.difficulty[hike.difficulty] ?? hike.difficulty}
            </span>
          )}
        </div>

        {/* Amenity badges — bottom right of image area, before title strip */}
        {(hike.hasCamping || hike.hasAccommodation) && (
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

        {/* Title + location overlaid on image */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-bold text-white text-lg leading-snug group-hover:text-emerald-300 transition-colors">
            {hike.title}
          </h3>
          <p className="text-white/60 text-sm flex items-center gap-1 mt-1">
            <MapPin size={13} className="shrink-0" /> {hike.destination}
          </p>
        </div>
      </div>

      {/* Bottom info strip */}
      <div className="px-5 py-3.5 flex items-center justify-between">
        <div className="flex gap-3.5 text-xs text-stone-400 font-medium">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {formatHikeDate(hike.date, hike.endDate, LOCALE_MAP[lang] ?? 'ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {hike.durationHours && (
            <span className="flex items-center gap-1"><Clock size={12} /> {hike.durationHours}h</span>
          )}
          <span className="flex items-center gap-1">
            <Users size={12} />
            {isUpcoming ? (
              isFull
                ? <span className="text-red-500 font-semibold">{dict.full}</span>
                : <span>{hike.confirmedCount}/{hike.maxParticipants}</span>
            ) : (
              <span>{hike.confirmedCount} {dict.went}</span>
            )}
            {isUpcoming && hike.waitlistCount > 0 && (
              <span className="text-stone-400">· {hike.waitlistCount} {dict.onWaitlist}</span>
            )}
          </span>
        </div>
        <ChevronRight size={17} className="text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  )
}
