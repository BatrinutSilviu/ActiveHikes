import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

type Row = { driver: string; seats: string; passenger: string; trip: string }

const TRIP_LABEL = { both: 'Both ways', there: 'Only there', back: 'Only back' } as const

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function toCsv(rows: Row[]) {
  const header = ['Driver', 'Seats', 'Passenger', 'Direction']
  const lines = [header, ...rows.map(r => [r.driver, r.seats, r.passenger, r.trip])]
  return lines.map(line => line.map(csvEscape).join(',')).join('\n')
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: hikeId } = await params

  const [hike, participants] = await Promise.all([
    prisma.hike.findUnique({ where: { id: hikeId }, select: { title: true } }),
    prisma.hikeParticipant.findMany({
      where: { hikeId, status: 'confirmed' },
      select: {
        id: true,
        friendName: true,
        hostParticipantId: true,
        bringsCar: true,
        carSeats: true,
        carTrip: true,
        carDriverParticipantId: true,
        user: { select: { name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    }),
  ])

  if (!hike) return NextResponse.json({ error: 'Hike not found' }, { status: 404 })

  const pName = (p: { user: { name: string | null } | null; friendName: string | null }) => p.user?.name ?? p.friendName ?? '?'
  const findById = (id: string) => participants.find(p => p.id === id)

  const passengerLabel = (p: (typeof participants)[number]) => {
    const host = p.hostParticipantId ? findById(p.hostParticipantId) : null
    return host ? `${pName(p)} (friend of ${pName(host)})` : pName(p)
  }

  const drivers = participants.filter(p => p.bringsCar && p.carSeats != null)
  const rows: Row[] = []
  const placed = new Set<string>()

  const driverLabel = (d: (typeof participants)[number]) =>
    d.carTrip === 'both' ? pName(d) : `${pName(d)} (${TRIP_LABEL[d.carTrip]})`

  for (const driver of drivers) {
    const carPassengers = participants.filter(p => p.carDriverParticipantId === driver.id)

    if (carPassengers.length === 0) {
      rows.push({ driver: driverLabel(driver), seats: String(driver.carSeats), passenger: '', trip: '' })
    }

    for (const p of carPassengers) {
      rows.push({ driver: driverLabel(driver), seats: String(driver.carSeats), passenger: passengerLabel(p), trip: TRIP_LABEL[p.carTrip] })
      placed.add(p.id)
    }
    placed.add(driver.id)
  }

  // Everyone not driving or riding in a car — one row per person
  for (const p of participants) {
    if (placed.has(p.id)) continue
    rows.push({ driver: '', seats: '', passenger: passengerLabel(p), trip: TRIP_LABEL[p.carTrip] })
  }

  const csv = toCsv(rows)
  const filename = `${hike.title.replace(/[^a-zA-Z0-9._-]/g, '_')}-cars.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
