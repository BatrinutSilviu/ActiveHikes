import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

type Row = { driver: string; seats: string; passenger: string; phone: string }

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function toCsv(rows: Row[]) {
  const header = ['Driver', 'Seats', 'Passenger', 'Phone']
  const lines = [header, ...rows.map(r => [r.driver, r.seats, r.passenger, r.phone])]
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
        user: { select: { name: true, phone: true } },
      },
      orderBy: { joinedAt: 'asc' },
    }),
  ])

  if (!hike) return NextResponse.json({ error: 'Hike not found' }, { status: 404 })

  const pName = (p: { user: { name: string | null } | null; friendName: string | null }) => p.user?.name ?? p.friendName ?? '?'
  const phone = (p: { user: { phone: string | null } | null }) => p.user?.phone ?? ''
  const findById = (id: string) => participants.find(p => p.id === id)

  const drivers = participants.filter(p => p.bringsCar && p.carSeats != null)
  const rows: Row[] = []
  const seen = new Set<string>()

  for (const driver of drivers) {
    const carPassengers = participants.filter(p => p.carDriverParticipantId === driver.id)

    // Hosts first, combined with their friend when the friend rides the same car
    for (const p of carPassengers) {
      if (seen.has(p.id) || p.hostParticipantId !== null) continue
      const friend = carPassengers.find(f => f.hostParticipantId === p.id)
      const label = friend ? `${pName(p)} + ${pName(friend)} (friend)` : pName(p)
      rows.push({ driver: pName(driver), seats: String(driver.carSeats), passenger: label, phone: phone(p) })
      seen.add(p.id)
      if (friend) seen.add(friend.id)
    }

    // Friends riding separately from their host (host assigned elsewhere or unassigned)
    for (const p of carPassengers) {
      if (seen.has(p.id) || p.hostParticipantId === null) continue
      const host = findById(p.hostParticipantId)
      rows.push({
        driver: pName(driver),
        seats: String(driver.carSeats),
        passenger: `${pName(p)} (friend of ${host ? pName(host) : '?'})`,
        phone: phone(p),
      })
      seen.add(p.id)
    }

    if (carPassengers.length === 0) {
      rows.push({ driver: pName(driver), seats: String(driver.carSeats), passenger: '', phone: phone(driver) })
    }
  }

  const unassigned = participants.filter(p => !p.bringsCar && p.carDriverParticipantId === null && p.hostParticipantId === null)
  for (const p of unassigned) {
    if (seen.has(p.id)) continue
    const friend = participants.find(f => f.hostParticipantId === p.id && !f.bringsCar && f.carDriverParticipantId === null)
    const label = friend ? `${pName(p)} + ${pName(friend)} (friend)` : pName(p)
    rows.push({ driver: '', seats: '', passenger: label, phone: phone(p) })
    seen.add(p.id)
    if (friend) seen.add(friend.id)
  }

  // Catch-all: anyone not yet placed (e.g. a friend riding separately from an
  // unassigned host, or vice versa) still gets a row instead of vanishing.
  for (const p of participants) {
    if (seen.has(p.id) || p.bringsCar) continue
    const host = p.hostParticipantId ? findById(p.hostParticipantId) : null
    const label = host ? `${pName(p)} (friend of ${pName(host)})` : pName(p)
    rows.push({ driver: '', seats: '', passenger: label, phone: phone(p) })
    seen.add(p.id)
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
