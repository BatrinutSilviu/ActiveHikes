import 'server-only'

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

// Rate limits for logging in, signing up, password resets and confirmation emails, per client IP and
// per email: at most `limit` hits per key in a fixed window of `windowMs`. The counters live in
// Postgres (RateLimit table), so a restart or redeploy doesn't hand out a fresh allowance.

let lastSweep = 0

/** Records a hit for `key`; false when the key is over its limit (the hit is still counted). */
export async function allow(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date()
  try {
    // One atomic statement: start a new window if there is none or it has run out, else count the hit.
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${new Date(now.getTime() + windowMs)})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
      RETURNING "count"`
    sweep(now)
    return Number(rows[0]?.count ?? 1) <= limit
  } catch (err) {
    // A limiter hiccup shouldn't lock everyone out; the database being down fails the request anyway.
    logger.error('rate limit check failed', { key, err })
    return true
  }
}

// Forget finished windows now and then, so the table stays small. Not awaited: it's housekeeping.
function sweep(now: Date) {
  if (now.getTime() - lastSweep < 10 * 60_000) return
  lastSweep = now.getTime()
  prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } })
    .catch(err => logger.error('rate limit sweep failed', { err }))
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
