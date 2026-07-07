import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const participants = await prisma.hikeParticipant.findMany({
    where: { hikeId: id },
    select: {
      id: true,
      status: true,
      guestName: true,
      bringsCar: true,
      carSeats: true,
      carDriverParticipantId: true,
      user: { select: { name: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({ participants }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
