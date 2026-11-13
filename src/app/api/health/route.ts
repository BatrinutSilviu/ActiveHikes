import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

// Liveness check for the Docker healthcheck (and anything else watching the app):
// 200 when the app can reach Postgres, 503 when it can't. No auth, never cached.
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Database check timed out')), 3000) }),
    ])
    return NextResponse.json({ ok: true }, { headers: NO_STORE })
  } catch (err) {
    logger.error('health check failed', { route: 'GET /api/health', err })
    return NextResponse.json({ ok: false }, { status: 503, headers: NO_STORE })
  } finally {
    clearTimeout(timer)
  }
}
