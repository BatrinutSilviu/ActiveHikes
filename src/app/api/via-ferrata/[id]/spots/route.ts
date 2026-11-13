import { NextRequest } from 'next/server'
import { eventSpotsResponse } from '@/lib/eventSpots'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return eventSpotsResponse(id, 'via_ferrata')
}
