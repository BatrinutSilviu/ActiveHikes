// Building blocks shared by the hike and Via Ferrata detail pages.
import Link from 'next/link'
import { MapPin, Mountain, MountainSnow, Car, ExternalLink, MessageCircle } from 'lucide-react'
import UploadedImage from '@/components/UploadedImage'

/** Admins can preview an event the way a confirmed participant sees it. */
export function AdminPreviewBar({
  isAdmin,
  isPreviewMode,
  eventUrl,
  dict,
}: {
  isAdmin: boolean
  isPreviewMode: boolean
  eventUrl: string
  dict: { previewBannerText: string; previewExitLabel: string; previewEnterLabel: string }
}) {
  if (isPreviewMode) {
    return (
      <div className="flex items-center justify-between gap-3 bg-amber-500 text-white text-sm font-semibold rounded-2xl px-4 py-3 mb-6">
        <span>{dict.previewBannerText}</span>
        <Link href={eventUrl} className="underline underline-offset-2 shrink-0">
          {dict.previewExitLabel}
        </Link>
      </div>
    )
  }
  if (!isAdmin) return null
  return (
    <div className="flex justify-end mb-6">
      <Link href={`${eventUrl}?preview=1`}
        className="text-xs font-semibold text-stone-500 hover:text-emerald-600 underline underline-offset-2">
        {dict.previewEnterLabel}
      </Link>
    </div>
  )
}

/** Cover photo(s) with the title overlaid. Two covers are shown side by side. */
export function EventHero({
  title,
  destination,
  mountainRange,
  coverImageUrl,
  coverImageUrl2,
}: {
  title: string
  destination: string
  mountainRange?: string | null
  coverImageUrl: string | null
  coverImageUrl2: string | null
}) {
  return (
    <div className="w-full h-72 sm:h-[28rem] rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-emerald-900 to-stone-800 relative shadow-xl">
      {coverImageUrl && coverImageUrl2 ? (
        <div className="absolute inset-0 flex">
          <UploadedImage src={coverImageUrl} alt={title} className="w-1/2 h-full object-cover" />
          <UploadedImage src={coverImageUrl2} alt={title} className="w-1/2 h-full object-cover" />
        </div>
      ) : coverImageUrl || coverImageUrl2 ? (
        <UploadedImage src={coverImageUrl ?? coverImageUrl2 ?? undefined} alt={title} className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Mountain size={72} className="text-white/10" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-8 pb-6 sm:pb-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-1 leading-tight drop-shadow">{title}</h1>
        <p className="text-stone-300 flex items-center gap-1.5 text-base">
          <MapPin size={15} /> {destination}
        </p>
        {mountainRange && (
          <p className="text-stone-400 flex items-center gap-1 mt-0.5 text-sm">
            <MountainSnow size={13} /> {mountainRange}
          </p>
        )}
      </div>
    </div>
  )
}

/** One fact (date, meeting point, …) in the grid under the description. */
export function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-stone-950/[0.04]">
      <div className="flex items-center gap-1.5 text-stone-400 text-[10px] font-semibold uppercase tracking-widest mb-2">{icon} {label}</div>
      <div className="text-stone-900 font-semibold text-sm leading-snug">{children}</div>
    </div>
  )
}

/** Link to the event's participants & carpool page. */
export function CarpoolLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-4 font-semibold shadow-sm transition-colors"
    >
      <span className="flex items-center gap-2">
        <Car size={18} /> {label}
      </span>
      <ExternalLink size={15} className="text-white/70" />
    </Link>
  )
}

/** Invite link to the event's WhatsApp group (only shown to confirmed participants). */
export function WhatsAppGroupLink({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-2xl transition-colors">
      <MessageCircle size={18} /> {label}
    </a>
  )
}
