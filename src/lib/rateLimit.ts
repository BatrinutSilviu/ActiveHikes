import 'server-only'

// Simple in-memory rate limits (one app instance): at most `limit` hits per key within `windowMs`.
// Used for logging in, signing up and password resets, per client IP and per email.

const hits = new Map<string, number[]>()
let lastSweep = Date.now()

/** Records a hit for `key`; false when the key is over its limit (the hit is still counted). */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  if (now - lastSweep > 10 * 60_000) {
    // Forget keys that have been quiet, so the map doesn't grow forever.
    for (const [k, times] of hits) if (times.every(t => now - t > 60 * 60_000)) hits.delete(k)
    lastSweep = now
  }
  const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs)
  recent.push(now)
  hits.set(key, recent)
  return recent.length <= limit
}

type HeaderBag = Headers | Record<string, string | string[] | undefined> | undefined

/** The client's IP as Traefik reports it (X-Real-Ip, else the last X-Forwarded-For hop). */
export function clientIp(headers: HeaderBag): string {
  const get = (name: string) => {
    if (!headers) return undefined
    if (headers instanceof Headers) return headers.get(name) ?? undefined
    const v = headers[name]
    return Array.isArray(v) ? v[v.length - 1] : v
  }
  return get('x-real-ip')?.trim() || get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown'
}

/** Emails are compared and stored in lower case. */
export const normalizeEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '')
export const isEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
