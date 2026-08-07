import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

type Row = { driver: string; seats: string; passenger: string }

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function toCsv(rows: Row[]) {
  const header = ['Driver', 'Seats', 'Passenger']
  const lines = [header, ...rows.map(r => [r.driver, r.seats, r.passenger])]
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

  for (const driver of drivers) {
    const carPassengers = participants.filter(p => p.carDriverParticipantId === driver.id)

    if (carPassengers.length === 0) {
      rows.push({ driver: pName(driver), seats: String(driver.carSeats), passenger: '' })
    }

    for (const p of carPassengers) {
      rows.push({ driver: pName(driver), seats: String(driver.carSeats), passenger: passengerLabel(p) })
      placed.add(p.id)
    }
    placed.add(driver.id)
  }

  // Everyone not driving or riding in a car — one row per person
  for (const p of participants) {
    if (placed.has(p.id)) continue
    rows.push({ driver: '', seats: '', passenger: passengerLabel(p) })
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
