import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lat = Number(req.nextUrl.searchParams.get('lat'))
  const lng = Number(req.nextUrl.searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=0`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ActiveHikes/1.0 (hike pickup lookup)' },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!res) return NextResponse.json({ address: null })
  if (!res.ok) return NextResponse.json({ address: null })

  const data = await res.json()
  return NextResponse.json({ address: data.display_name ?? null })
}
