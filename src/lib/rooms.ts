import 'server-only'
import { prisma } from '@/lib/db'
import { RoomType } from '@prisma/client'

export const ROOM_CAPACITY: Record<RoomType, number> = {
  double: 2,
  triple: 3,
  quadruple: 4,
}

const ROOM_TYPES: RoomType[] = ['double', 'triple', 'quadruple']

/** Creates/removes HikeRoom rows so each type's count matches the desired counts. Never deletes an occupied room. */
export async function syncHikeRooms(
  hikeId: string,
  counts: { doubleRoomCount: number; tripleRoomCount: number; quadrupleRoomCount: number }
) {
  const desiredByType: Record<RoomType, number> = {
    double: Math.max(0, counts.doubleRoomCount || 0),
    triple: Math.max(0, counts.tripleRoomCount || 0),
    quadruple: Math.max(0, counts.quadrupleRoomCount || 0),
  }

  for (const type of ROOM_TYPES) {
    const desired = desiredByType[type]
    const existing = await prisma.hikeRoom.findMany({
      where: { hikeId, type },
      orderBy: { createdAt: 'asc' },
      include: { occupants: { select: { id: true } } },
    })

    if (existing.length < desired) {
      const toCreate = desired - existing.length
      for (let i = 0; i < toCreate; i++) {
        await prisma.hikeRoom.create({
          data: {
            hikeId,
            type,
            capacity: ROOM_CAPACITY[type],
            label: String(existing.length + i + 1),
          },
        })
      }
    } else if (existing.length > desired) {
      const toRemove = existing.length - desired
      const removable = existing
        .slice()
        .reverse()
        .filter(r => r.occupants.length === 0)
        .slice(0, toRemove)
      if (removable.length) {
        await prisma.hikeRoom.deleteMany({ where: { id: { in: removable.map(r => r.id) } } })
      }
    }
  }
}
