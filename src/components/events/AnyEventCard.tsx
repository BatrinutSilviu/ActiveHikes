import type { Hike } from '@prisma/client'
import HikeCard, { toHikeCardData } from '@/components/HikeCard'
import ViaFerrataCard, { toViaFerrataCardData } from '@/components/viaFerrata/ViaFerrataCard'
import GeneralEventCard, { toGeneralEventCardData } from '@/components/generalEvents/GeneralEventCard'
import type { Dictionary } from '@/lib/i18n'

// Hikes, via ferratas and general events listed together: each keeps its own card.

type EventRow = Hike & { participants: { status: string }[] }

export type AnyEventCardData =
  | { kind: 'hike'; id: string; date: string; data: ReturnType<typeof toHikeCardData> }
  | { kind: 'via_ferrata'; id: string; date: string; data: ReturnType<typeof toViaFerrataCardData> }
  | { kind: 'event'; id: string; date: string; data: ReturnType<typeof toGeneralEventCardData> }

export function toAnyEventCardData(row: EventRow): AnyEventCardData {
  const base = { id: row.id, date: row.date.toISOString() }
  if (row.type === 'hike') return { ...base, kind: 'hike', data: toHikeCardData(row) }
  if (row.type === 'via_ferrata') return { ...base, kind: 'via_ferrata', data: toViaFerrataCardData(row) }
  return { ...base, kind: 'event', data: toGeneralEventCardData(row) }
}

export default function AnyEventCard({ event, lang, dict }: { event: AnyEventCardData; lang: string; dict: Dictionary }) {
  if (event.kind === 'hike') return <HikeCard hike={event.data} lang={lang} dict={dict.hikeCard} />
  if (event.kind === 'via_ferrata') return <ViaFerrataCard viaFerrata={event.data} lang={lang} dict={dict.viaFerrataCard} />
  return <GeneralEventCard event={event.data} lang={lang} dict={dict.events.card} />
}
