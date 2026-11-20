import 'server-only'
import { prisma } from '@/lib/db'
import { snapshotParticipants, systemActor, writeParticipantLog } from '@/lib/participantLog'
import { revalidateParticipantCountPaths } from '@/lib/revalidateHike'
import { groupIntoUnits } from '@/lib/participantPairs'

/**
 * A free member event whose confirmed list has room again: the waitlist moves up in the order people
 * signed up, as long as each (with their friend) fits.
 */
export async function promoteFromWaitlist(hikeId: string) {
  const ids = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ maxParticipants: number }[]>`SELECT "maxParticipants" FROM "Hike" WHERE id = ${hikeId} FOR UPDATE`
    if (!rows.length) return []
    const confirmed = await tx.hikeParticipant.count({ where: { hikeId, status: 'confirmed' } })
    const waiting = await tx.hikeParticipant.findMany({
      where: { hikeId, status: 'waitlist' },
      orderBy: { joinedAt: 'asc' },
      select: { id: true, hostParticipantId: true },
    })
    let free = rows[0].maxParticipants - confirmed
    const promoted: string[] = []
    for (const unit of groupIntoUnits(waiting)) {
      if (unit.length > free) break
      promoted.push(...unit)
      free -= unit.length
    }
    if (promoted.length) {
      await tx.hikeParticipant.updateMany({ where: { id: { in: promoted } }, data: { status: 'confirmed', confirmedAt: new Date() } })
    }
    return promoted
  })
  if (ids.length) {
    // Snapshot taken after the change, so record where they came from by hand.
    const people = (await snapshotParticipants(ids)).map(p => ({ ...p, status: 'waitlist' as const }))
    await writeParticipantLog(people, { action: 'status', actor: systemActor, toStatus: 'confirmed' })
    revalidateParticipantCountPaths(hikeId)
  }
}
