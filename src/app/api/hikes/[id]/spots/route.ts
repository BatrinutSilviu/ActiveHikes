import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [hike, confirmed, waitlist] = await Promise.all([
    prisma.hike.findUnique({ where: { id }, select: { maxParticipants: true } }),
    prisma.hikeParticipant.count({ where: { hikeId: id, status: 'confirmed' } }),
    prisma.hikeParticipant.count({ where: { hikeId: id, status: 'waitlist' } }),
  ])

  if (!hike) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    confirmedCount: confirmed,
    maxParticipants: hike.maxParticipants,
    spotsLeft: Math.max(hike.maxParticipants - confirmed, 0),
    isFull: confirmed >= hike.maxParticipants,
    waitlistCount: waitlist,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
