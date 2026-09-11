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
    try {
      await runPaymentSync()
    } catch (err) {
      console.error('Revolut payment sync failed:', err)
    } finally {
      running = false
    }
  }

  tick()
  setInterval(tick, intervalMs)
}
