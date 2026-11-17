// Sports sessions (a match, a run, a training): players just show up at the place, so the event
// form leaves out the address / meeting point, the "what to bring" list and the WhatsApp group link.
const SPORTS = new Set([
  'football',
  'hyrox',
  'volleyball',
  'basketball',
  'biking',
  'foot tennis',
  'tennis',
  'handball',
  'running',
])

export function isSportCategory(category: string | null | undefined): boolean {
  return !!category && SPORTS.has(category.trim().toLowerCase())
}
