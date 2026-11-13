// Camping and accommodation boxes on the hike detail page.
import Link from 'next/link'
import { Clock, ExternalLink, Hotel, Tent } from 'lucide-react'
import type { Hike } from '@prisma/client'
import { formatRon } from '@/lib/money'

type CampingInfo = Pick<Hike, 'campingDetails' | 'campingUrl' | 'campingPrice'>

export function HikeCampingBox({
  hike,
  dict,
}: {
  hike: CampingInfo
  dict: { campingTitle: string; campingBookingLink: string; campingCost: string }
}) {
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
      <h3 className="font-semibold text-amber-800 flex items-center gap-2">
        <Tent size={16} /> {dict.campingTitle}
      </h3>
      {hike.campingDetails && (
        <p className="text-amber-700 text-sm break-words">{hike.campingDetails}</p>
      )}
      {hike.campingUrl && (
        <a
          href={hike.campingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <ExternalLink size={15} /> {dict.campingBookingLink}
        </a>
      )}
      {hike.campingPrice && (
        <div className="bg-white rounded-lg p-3 inline-block text-center">
          <div className="text-lg font-bold text-amber-800">{formatRon(Number(hike.campingPrice))}</div>
          <div className="text-xs text-amber-500 mt-0.5">{dict.campingCost}</div>
        </div>
      )}
    </div>
  )
}

type AccommodationInfo = Pick<
  Hike,
  'accommodationDetails' | 'accommodationUrl' | 'accommodationPrice' | 'accommodationDeposit'
  | 'checkInTime' | 'checkOutTime' | 'breakfastTime' | 'dinnerTime'
>

type AccommodationDict = {
  accommodationTitle: string
  accommodationBookingLink: string
  accommodationCost: string
  accommodationDeposit: string
  accommodationRemaining: string
  accommodationRemainingNote: string
  checkInTime: string
  checkOutTime: string
  breakfastTime: string
  dinnerTime: string
  roomsTitle: string
}

export function HikeAccommodationBox({
  hike,
  roomsUrl,
  dict,
}: {
  hike: AccommodationInfo
  /** Link to the room picker, when the hike has rooms set up. */
  roomsUrl: string | null
  dict: AccommodationDict
}) {
  const schedule = [
    { time: hike.checkInTime, label: dict.checkInTime },
    { time: hike.checkOutTime, label: dict.checkOutTime },
    { time: hike.breakfastTime, label: dict.breakfastTime },
    { time: hike.dinnerTime, label: dict.dinnerTime },
  ]
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-blue-800 flex items-center gap-2">
        <Hotel size={16} /> {dict.accommodationTitle}
      </h3>
      {hike.accommodationDetails && (
        <p className="text-blue-700 text-sm break-words">{hike.accommodationDetails}</p>
      )}
      {hike.accommodationUrl && (
        <a
          href={hike.accommodationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <ExternalLink size={15} /> {dict.accommodationBookingLink}
        </a>
      )}
      {hike.accommodationPrice && (
        <AccommodationPrices
          price={Number(hike.accommodationPrice)}
          deposit={hike.accommodationDeposit ? Number(hike.accommodationDeposit) : null}
          dict={dict}
        />
      )}
      {hike.accommodationPrice && hike.accommodationDeposit && (
        <p className="text-blue-600 text-xs leading-relaxed">{dict.accommodationRemainingNote}</p>
      )}
      {schedule.some(s => s.time) && (
        <div className="flex flex-wrap gap-4">
          {schedule.map(({ time, label }) => time && (
            <span key={label} className="flex items-center gap-1.5 text-sm text-blue-700">
              <Clock size={14} /> {label}: {time}
            </span>
          ))}
        </div>
      )}
      {roomsUrl && (
        <Link
          href={roomsUrl}
          className="flex w-full items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <ExternalLink size={15} /> {dict.roomsTitle}
        </Link>
      )}
    </div>
  )
}

/** Full price, plus the deposit paid upfront and what's left to pay at the place. */
function AccommodationPrices({ price, deposit, dict }: { price: number; deposit: number | null; dict: AccommodationDict }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div className="bg-white rounded-lg p-3 text-center">
        <div className="text-lg font-bold text-blue-800">{formatRon(price)}</div>
        <div className="text-xs text-blue-500 mt-0.5">{dict.accommodationCost}</div>
      </div>
      {deposit && (
        <>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-amber-700">{formatRon(deposit)}</div>
            <div className="text-xs text-amber-500 mt-0.5">{dict.accommodationDeposit}</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-stone-700">{formatRon(price - deposit)}</div>
            <div className="text-xs text-stone-400 mt-0.5">{dict.accommodationRemaining}</div>
          </div>
        </>
      )}
    </div>
  )
}
