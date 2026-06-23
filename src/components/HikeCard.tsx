import Link from 'next/link'
import { Calendar, MapPin, Users, Clock, Tent, Hotel, ChevronRight } from 'lucide-react'

type HikeCardData = {
  id: string
  title: string
  destination: string
  description: string | null
  date: string
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
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-orange-100 text-orange-700',
  expert: 'bg-red-100 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-emerald-100 text-emerald-700',
  ongoing: 'bg-blue-100 text-blue-700',
  completed: 'bg-stone-100 text-stone-600',
  cancelled: 'bg-red-100 text-red-600',
}

export default function HikeCard({ hike, lang, dict }: { hike: HikeCardData; lang: string; dict: HikeCardDict }) {
  const spotsLeft = hike.maxParticipants - hike.confirmedCount
  const isFull = spotsLeft <= 0
  const isUpcoming = hike.status === 'upcoming'

  return (
    <Link href={`/${lang}/hikes/${hike.id}`}
      className="group block bg-white rounded-2xl shadow-sm border border-stone-100 hover:shadow-md hover:border-stone-200 transition-all overflow-hidden">
      <div className="h-48 bg-gradient-to-br from-emerald-800 to-stone-700 relative overflow-hidden">
        {hike.coverImageUrl ? (
          <img src={hike.coverImageUrl} alt={hike.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-end p-4">
            <span className="text-white/60 text-sm">{dict.noCoverPhoto}</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[hike.status]}`}>
            {hike.status.charAt(0).toUpperCase() + hike.status.slice(1)}
          </span>
          {hike.difficulty && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${DIFFICULTY_COLORS[hike.difficulty]}`}>
              {hike.difficulty.charAt(0).toUpperCase() + hike.difficulty.slice(1)}
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 flex gap-2">
          {hike.hasCamping && (
            <span className="bg-black/40 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Tent size={12} /> {dict.camping}
            </span>
          )}
          {hike.hasAccommodation && !hike.hasCamping && (
            <span className="bg-black/40 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Hotel size={12} /> {dict.accommodation}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-lg text-stone-900 group-hover:text-emerald-700 transition-colors">{hike.title}</h3>
        <p className="text-stone-500 text-sm mt-1 flex items-center gap-1">
          <MapPin size={14} className="shrink-0" /> {hike.destination}
        </p>
        {hike.description && (
          <p className="text-stone-600 text-sm mt-2 line-clamp-2">{hike.description}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-600">
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {new Date(hike.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {hike.durationHours && (
            <span className="flex items-center gap-1"><Clock size={14} /> {hike.durationHours}h</span>
          )}
          <span className="flex items-center gap-1">
            <Users size={14} />
            {isUpcoming ? (
              isFull ? <span className="text-red-600 font-medium">{dict.full}</span>
                : <span>{hike.confirmedCount}/{hike.maxParticipants} {dict.joined}</span>
            ) : (
              <span>{hike.confirmedCount} {dict.went}</span>
            )}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="font-semibold text-emerald-700">
            {hike.entryFee > 0 ? `${hike.entryFee} RON` : dict.free}
          </span>
          <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium group-hover:gap-2 transition-all">
            {dict.viewDetails} <ChevronRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  )
}
