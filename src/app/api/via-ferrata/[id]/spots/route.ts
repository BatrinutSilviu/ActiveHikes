import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [viaFerrata, confirmed, waitlist] = await Promise.all([
    prisma.hike.findFirst({ where: { id, type: 'via_ferrata' }, select: { maxParticipants: true } }),
    prisma.hikeParticipant.count({ where: { hikeId: id, status: 'confirmed' } }),
    prisma.hikeParticipant.count({ where: { hikeId: id, status: 'waitlist' } }),
  ])

  if (!viaFerrata) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    confirmedCount: confirmed,
    maxParticipants: viaFerrata.maxParticipants,
    spotsLeft: Math.max(viaFerrata.maxParticipants - confirmed, 0),
    isFull: confirmed >= viaFerrata.maxParticipants,
    waitlistCount: waitlist,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
