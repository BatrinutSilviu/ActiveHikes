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
