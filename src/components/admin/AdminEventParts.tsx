// Pieces shared by the admin pages of a hike and of a Via Ferrata event.
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { ParticipantStatus } from '@prisma/client'
import HikeStatusControl from '@/components/admin/HikeStatusControl'
import JoinButton from '@/components/events/join/JoinButton'
import type { CarTripDict, JoinButtonDict, Registration } from '@/components/events/join/types'

/** Back link, title with place and date, the public-page link and the status control. */
export function AdminEventHeader({
  lang,
  title,
  subtitle,
  publicUrl,
  statusControl,
  dict,
}: {
  lang: string
  title: string
  subtitle: string
  publicUrl: string
  statusControl: React.ComponentProps<typeof HikeStatusControl>
  dict: { backToDashboard: string; viewPublicPage: string }
}) {
  return (
    <>
      <Link href={`/${lang}/admin`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {dict.backToDashboard}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{title}</h1>
          <p className="text-stone-500 mt-1">{subtitle}</p>
        </div>
        <Link href={publicUrl} className="text-emerald-600 hover:underline text-sm font-medium" target="_blank">
          {dict.viewPublicPage}
        </Link>
      </div>

      <div className="mb-8">
        <HikeStatusControl {...statusControl} />
      </div>
    </>
  )
}

const COUNTED_STATUSES: ParticipantStatus[] = ['confirmed', 'pending', 'waitlist', 'rejected']

/** One tile per registration status with how many participants have it. */
export function StatusCountsGrid({
  participants,
  labels,
}: {
  participants: { status: ParticipantStatus }[]
  labels: Record<string, string>
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {COUNTED_STATUSES.map(status => (
        <div key={status} className="bg-white border border-stone-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-stone-900">{participants.filter(p => p.status === status).length}</div>
          <div className="text-xs text-stone-500 capitalize mt-0.5">{labels[status] ?? status}</div>
        </div>
      ))}
    </div>
  )
}

/** The admin's own registration, so they can sign up for their events like anyone else. */
export function AdminRegistrationCard({
  title,
  ...joinButton
}: { title: string } & {
  hikeId: string
  userId: string | null
  isFull: boolean
  registration: Registration | null
  waitlistPosition: number | null
  waitlistCount: number
  dict: JoinButtonDict
  tripDict: CarTripDict
  lang: string
}) {
  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-5">
      <h2 className="text-xl font-bold text-stone-800 mb-4">{title}</h2>
      <JoinButton {...joinButton} />
    </div>
  )
}

const ACTION_LINK_COLORS = {
  sky: 'bg-gradient-to-br from-sky-500 to-sky-700 text-white rounded-2xl p-4 shadow-md shadow-sky-200 hover:shadow-lg hover:shadow-sky-300',
  violet: 'bg-gradient-to-br from-violet-500 to-violet-700 text-white rounded-2xl p-4 shadow-md shadow-violet-200 hover:shadow-lg hover:shadow-violet-300',
}

/** Big colored link to a management sub-page (cars, rooms). */
export function AdminActionLink({
  href,
  icon,
  label,
  color,
  grow = false,
}: {
  href: string
  icon: React.ReactNode
  label: string
  color: keyof typeof ACTION_LINK_COLORS
  /** Share the row with sibling links. */
  grow?: boolean
}) {
  return (
    <Link href={href}
      className={`${grow ? 'flex-1 ' : ''}group flex items-center gap-3 ${ACTION_LINK_COLORS[color]} hover:-translate-y-0.5 transition-all`}>
      <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="font-bold flex-1">{label}</span>
      <ChevronRight size={18} className="text-white/70 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  )
}
