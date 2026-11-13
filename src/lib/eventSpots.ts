import 'server-only'
import { NextResponse } from 'next/server'
import type { HikeType } from '@prisma/client'
import { prisma } from '@/lib/db'

/**
 * The live spot counts the event pages poll (see useLiveSpots). Drafts answer 404 so
 * they can't be discovered through the API. `type` restricts the lookup to one kind of event.
 */
export async function eventSpotsResponse(id: string, type?: HikeType) {
  const [event, confirmed, waitlist] = await Promise.all([
    prisma.hike.findFirst({ where: { id, ...(type && { type }) }, select: { maxParticipants: true, status: true } }),
    prisma.hikeParticipant.count({ where: { hikeId: id, status: 'confirmed' } }),
    prisma.hikeParticipant.count({ where: { hikeId: id, status: 'waitlist' } }),
  ])

  if (!event || event.status === 'draft') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    confirmedCount: confirmed,
    maxParticipants: event.maxParticipants,
    spotsLeft: Math.max(event.maxParticipants - confirmed, 0),
    isFull: confirmed >= event.maxParticipants,
    waitlistCount: waitlist,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
