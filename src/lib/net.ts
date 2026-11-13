// Client-side network helpers for flaky mobile connections (trailheads, mountain huts):
// every request gets a timeout so nothing spins forever, and idempotent GETs retry a couple
// of times with backoff. Mutations never retry automatically — the user retries them.

export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const controller = new AbortController()
  setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), ms)
  return controller.signal
}

const RETRYABLE_STATUS = new Set([502, 503, 504])
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * fetch() with a timeout. GET/HEAD requests are retried (up to `retries` times, with backoff)
 * on network errors, timeouts and 502/503/504; other methods are sent once.
 * Network failures and timeouts reject with a NetworkError.
 */
export async function apiFetch(
  input: string,
  init: RequestInit & { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const { timeoutMs = 15_000, retries = 2, ...rest } = init
  const method = (rest.method ?? 'GET').toUpperCase()
  const maxAttempts = method === 'GET' || method === 'HEAD' ? retries + 1 : 1

  for (let attempt = 1; ; attempt++) {
    const isLast = attempt >= maxAttempts
    try {
      const res = await fetch(input, { ...rest, signal: timeoutSignal(timeoutMs) })
      if (isLast || !RETRYABLE_STATUS.has(res.status)) return res
    } catch (err) {
      if (isLast) throw new NetworkError(err instanceof Error ? err.message : undefined)
    }
    await sleep(500 * 3 ** (attempt - 1)) // 0.5s, 1.5s, …
  }
}

/** Options for requests polled every few seconds: a failed poll isn't retried — the next poll is the retry. */
export const POLL_REQUEST = { cache: 'no-store', timeoutMs: 4000, retries: 0 } as const

/**
 * Rejects with a NetworkError if `promise` (e.g. a server action call) hasn't settled in time,
 * so a stalled connection shows an error instead of a button stuck on "Saving…".
 * The request itself may still complete in the background.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 30_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new NetworkError('Request timed out')), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

/** True for failures caused by the connection rather than the server's answer. */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (err instanceof NetworkError) return true
  // fetch() (also under server actions) rejects with a TypeError whose message depends on the browser
  if (err instanceof TypeError && /failed to fetch|load failed|networkerror|network request failed/i.test(err.message)) return true
  return err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')
}
