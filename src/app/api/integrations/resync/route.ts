import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { resyncUpcoming } from '@/lib/managementSync'
import { logger } from '@/lib/logger'

// Nightly (the server's ops/resync-management.sh): sends the upcoming hikes and events to the
// management app again. Protected by the same secret as the pushes (MANAGEMENT_SYNC_TOKEN).
export async function POST(req: NextRequest) {
  const token = process.env.MANAGEMENT_SYNC_TOKEN
  if (!token || !process.env.MANAGEMENT_SYNC_URL) return NextResponse.json({ error: 'Sync not configured' }, { status: 503 })
  const given = Buffer.from((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''))
  const want = Buffer.from(token)
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await resyncUpcoming()
  logger.info('management resync', { job: 'management-sync', sent: result.sent, failed: result.failed.length })
  return NextResponse.json(result, { status: result.failed.length ? 502 : 200 })
}
