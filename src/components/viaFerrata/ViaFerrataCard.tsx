import Link from 'next/link'
import { Calendar, Users, Clock, ChevronRight, Mountain, MapPin } from 'lucide-react'
import { formatHikeDate } from '@/lib/dates'

const LOCALE_MAP: Record<string, string> = { en: 'en-GB', ro: 'ro-RO' }

type ViaFerrataCardData = {
  id: string
  title: string
  location: string
  date: string
  price: number
  maxParticipants: number
  durationHours: number | null
  status: string
  confirmedCount: number
  waitlistCount: number
}

type ViaFerrataCardDict = {
  full: string
  joined: string
  went: string
  viewDetails: string
  free: string
  onWaitlist: string
  status: Record<string, string>
}

const STATUS_TEXT: Record<string, string> = {
  upcoming: 'text-emerald-600',
  ongoing: 'text-blue-600',
  completed: 'text-stone-500',
  cancelled: 'text-red-500',
}

export default function ViaFerrataCard({ viaFerrata, lang, dict }: { viaFerrata: ViaFerrataCardData; lang: string; dict: ViaFerrataCardDict }) {
  const spotsLeft = viaFerrata.maxParticipants - viaFerrata.confirmedCount
  const isFull = spotsLeft <= 0
  const isUpcoming = viaFerrata.status === 'upcoming'
  const priceLabel = viaFerrata.price > 0 ? `${viaFerrata.price} RON` : dict.free

  return (
    <Link href={`/${lang}/via-ferrata/${viaFerrata.id}`}
      className="group block bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">

      <div className="relative h-60 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-emerald-800 to-stone-800 flex items-center justify-center">
          <Mountain size={56} className="text-white/10" />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />

        <div className="absolute top-3.5 right-3.5">
          <span className="bg-white text-stone-900 font-bold text-sm px-3 py-1.5 rounded-full shadow-md">
            {priceLabel}
          </span>
        </div>

        <div className="absolute top-3.5 left-3.5 flex gap-1.5">
          <span className={`bg-white/90 backdrop-blur-sm text-xs font-semibold px-2.5 py-1.5 rounded-full ${STATUS_TEXT[viaFerrata.status]}`}>
            {dict.status[viaFerrata.status] ?? viaFerrata.status}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-bold text-white text-lg leading-snug group-hover:text-emerald-300 transition-colors">
            {viaFerrata.title}
          </h3>
          <p className="text-white/60 text-sm flex items-center gap-1 mt-1">
            <MapPin size={13} className="shrink-0" /> {viaFerrata.location}
          </p>
        </div>
      </div>

      <div className="px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex gap-3.5 text-xs text-stone-400 font-medium">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatHikeDate(viaFerrata.date, null, LOCALE_MAP[lang] ?? 'ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {viaFerrata.durationHours && (
              <span className="flex items-center gap-1"><Clock size={12} /> {viaFerrata.durationHours}h</span>
            )}
            <span className="flex items-center gap-1">
              <Users size={12} />
              {isUpcoming ? (
                isFull
                  ? <span className="text-red-500 font-semibold">{dict.full}</span>
                  : <span>{viaFerrata.confirmedCount}/{viaFerrata.maxParticipants}</span>
              ) : (
                <span>{viaFerrata.confirmedCount} {dict.went}</span>
              )}
              {isUpcoming && viaFerrata.waitlistCount > 0 && (
                <span className="text-stone-400">· {viaFerrata.waitlistCount} {dict.onWaitlist}</span>
              )}
            </span>
          </div>
          <ChevronRight size={17} className="text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  )
}
