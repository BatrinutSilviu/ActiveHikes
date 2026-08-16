// An event's date passing is what moves it from "upcoming" to "past" everywhere it's
// listed, independent of its admin-controlled status (which only gates post-hike actions
// like photo/GPX uploads and stays 'ongoing' until manually marked completed/cancelled).
export function isEventPast(date: Date | string, endDate?: Date | string | null): boolean {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const cutoff = new Date(endDate ?? date)
  cutoff.setUTCHours(0, 0, 0, 0)
  return cutoff < today
}

export function isPastEvent(status: string, date: Date | string, endDate?: Date | string | null): boolean {
  if (status === 'completed' || status === 'cancelled') return true
  return isEventPast(date, endDate)
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
