import type { Instrumentation } from 'next'
import { logger } from '@/lib/logger'

// Runs once when the Next.js server process starts (see next.config.ts —
// this app runs as a single persistent Node process via `next start`, not
// serverless, so a plain setInterval here is safe: no risk of multiple
// instances firing the same sync concurrently).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { runPaymentSync } = await import('@/lib/revolutSync')
  // PSD2 caps unattended data fetches at 4/day per ASPSP — default to
  // exactly that cadence (6h), which is also Enable Banking's own
  // recommended backoff after a rate-limit hit.
  const intervalMs = Number(process.env.REVOLUT_SYNC_INTERVAL_MS) || 6 * 60 * 60 * 1000

  let running = false
  const tick = async () => {
    if (running) return
    running = true
    const startedAt = Date.now()
    logger.info('payment sync started', { job: 'revolut-sync' })
    try {
      const result = await runPaymentSync()
      if (result) logger.info('payment sync done', { job: 'revolut-sync', ...result, durationMs: Date.now() - startedAt })
    } catch (err) {
      logger.error('payment sync failed', { job: 'revolut-sync', durationMs: Date.now() - startedAt, err })
    } finally {
      running = false
    }
  }

  tick()
  setInterval(tick, intervalMs)
}

// Every error Next.js catches while serving a request — route handlers, server actions,
// server rendering and the proxy — lands here as one JSON line with the method and path.
// (Server actions are identified by Next's action id; routePath is the page that called it.)
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const actionId = request.headers['next-action']
  logger.error('request failed', {
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
    ...(actionId ? { actionId } : {}),
    err,
  })
}
