import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Like the spot counts: drafts can't be discovered through the API.
  const hike = await prisma.hike.findUnique({ where: { id }, select: { status: true } })
  if (!hike || hike.status === 'draft') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const participants = await prisma.hikeParticipant.findMany({
    where: { hikeId: id },
    select: {
      id: true,
      status: true,
      friendName: true,
      hostParticipantId: true,
      bringsCar: true,
      carSeats: true,
      carTrip: true,
      carDriverParticipantId: true,
      user: { select: { name: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({ participants }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
