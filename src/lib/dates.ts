// Event times (meeting time, dates) are wall-clock times in Romania.
const EVENT_TZ = 'Europe/Bucharest'

type EventTiming = {
  meetingTime?: string | null
  durationHours?: number | string | { toString(): string } | null
}

// Offset of EVENT_TZ from UTC (ms) at the given instant — handles summer/winter time.
function tzOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(at)
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return Math.round((asUtc - at.getTime()) / 60000) * 60000
}

// The real instant for "minutes after midnight" on a calendar day, in Romanian time.
function localInstant(day: Date, minutes: number): Date {
  const guess = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) + minutes * 60000
  return new Date(guess - tzOffsetMs(new Date(guess)))
}

// Accepts "08:30", "8:30", "08.30", "8h30" — returns minutes after midnight.
function parseTimeOfDay(value: string | null | undefined): number | null {
  const m = value?.match(/(\d{1,2})\s*[:.h]\s*(\d{2})/)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

// When the event starts: its meeting time on the start date, or midnight if no time is set.
export function eventStartsAt(date: Date | string, timing?: EventTiming): Date {
  return localInstant(new Date(date), parseTimeOfDay(timing?.meetingTime) ?? 0)
}

// When the event is over. A single-day event with a meeting time and duration ends
// at meeting time + duration; otherwise it ends at midnight after its last day.
// Uses the later of date/endDate so a mistyped end date (before the start) can't
// push a future event into history.
export function eventEndsAt(date: Date | string, endDate?: Date | string | null, timing?: EventTiming): Date {
  const start = new Date(date)
  const end = endDate ? new Date(endDate) : null
  const lastDay = end && end > start ? end : start
  const multiDay = lastDay.toISOString().slice(0, 10) !== start.toISOString().slice(0, 10)

  const startMinutes = parseTimeOfDay(timing?.meetingTime)
  const hours = timing?.durationHours != null ? Number(timing.durationHours.toString()) : NaN
  if (!multiDay && startMinutes != null && hours > 0) {
    return new Date(eventStartsAt(date, timing).getTime() + hours * 3600000)
  }
  return localInstant(lastDay, 24 * 60)
}

// An event ending is what moves it from "upcoming" to "past" everywhere it's listed.
// advanceEventStatuses applies the same rule to mark its status 'completed'.
export function isEventPast(date: Date | string, endDate?: Date | string | null, timing?: EventTiming): boolean {
  return eventEndsAt(date, endDate, timing).getTime() <= Date.now()
}

export function isPastEvent(status: string, date: Date | string, endDate?: Date | string | null, timing?: EventTiming): boolean {
  if (status === 'completed' || status === 'cancelled') return true
  return isEventPast(date, endDate, timing)
}

export function formatHikeDate(
  date: Date | string,
  endDate: Date | string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  const start = new Date(date)
  const startStr = start.toLocaleDateString(locale, options)
  if (!endDate) return startStr

  const end = new Date(endDate)
  if (end.toDateString() === start.toDateString()) return startStr

  return `${startStr} – ${end.toLocaleDateString(locale, options)}`
}
