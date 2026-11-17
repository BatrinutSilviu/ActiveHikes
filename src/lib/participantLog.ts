import type { ParticipantStatus, Prisma, PrismaClient } from '@prisma/client'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

// The history of each sign-up for an event (ParticipantLog), shown to the admins on the event's page.
// Every action that changes a participation records what happened here: take a snapshot of the people
// it touches before the change (their names and status then), make the change, then write the entries.
// A failure to log is reported but never undoes or blocks the action itself.

export type LogAction =
  | 'joined' // signed up (with a friend: one entry each)
  | 'cancelled' // withdrew their own sign-up
  | 'removed' // an admin removed them (a friend taken off a sign-up)
  | 'added' // an admin added someone with an account
  | 'imported' // an admin added someone without an account (name only)
  | 'status' // status changed by an admin (confirm, waitlist, reject…)
  | 'payment' // a payment confirmed them (matched automatically, or assigned by an admin)
  | 'payment_expired' // didn't pay in time: moved to the waitlist
  | 'car' // their car details (driving, seats, direction)
  | 'ride' // which car they ride in
  | 'room' // which room they sleep in
  | 'document_uploaded'
  | 'document_deleted'

export type LogActor = { kind: 'self' | 'admin' | 'system'; name?: string | null }

export const selfActor: LogActor = { kind: 'self' }
export const systemActor: LogActor = { kind: 'system' }
export const adminActor = (session: Session | null): LogActor => ({ kind: 'admin', name: session?.user?.name ?? null })

type Db = PrismaClient | Prisma.TransactionClient

export type ParticipantSnapshot = {
  id: string
  hikeId: string
  userId: string | null
  status: ParticipantStatus
  personName: string
  friendOf: string | null
}

/** The people about to be changed, as they are now (call before the change). */
export async function snapshotParticipants(ids: (string | null | undefined)[], db: Db = prisma): Promise<ParticipantSnapshot[]> {
  const wanted = ids.filter((id): id is string => !!id)
  if (!wanted.length) return []
  const rows = await db.hikeParticipant.findMany({
    where: { id: { in: wanted } },
    select: {
      id: true, hikeId: true, userId: true, status: true, friendName: true,
      user: { select: { name: true } },
      host: { select: { user: { select: { name: true } } } },
    },
  })
  return rows.map(r => ({
    id: r.id,
    hikeId: r.hikeId,
    userId: r.userId,
    status: r.status,
    personName: r.user?.name ?? r.friendName ?? '?',
    friendOf: r.host ? r.host.user?.name ?? '?' : null,
  }))
}

/** Writes one entry per person. `toStatus` is their status after the change, when it changed;
 *  `fresh` marks a new sign-up (no status before). */
export async function writeParticipantLog(
  people: ParticipantSnapshot[],
  entry: {
    action: LogAction
    actor: LogActor
    toStatus?: ParticipantStatus | null
    fresh?: boolean
    details?: Prisma.InputJsonObject | ((p: ParticipantSnapshot) => Prisma.InputJsonObject | undefined)
  },
  db: Db = prisma,
) {
  if (!people.length) return
  const write = () => db.participantLog.createMany({
    data: people.map(p => ({
      hikeId: p.hikeId,
      participantId: p.id,
      userId: p.userId,
      personName: p.personName,
      friendOf: p.friendOf,
      action: entry.action,
      fromStatus: entry.fresh ? null : p.status,
      toStatus: entry.toStatus ?? (entry.fresh ? p.status : null),
      actor: entry.actor.kind,
      actorName: entry.actor.kind === 'admin' ? entry.actor.name ?? null : null,
      details: typeof entry.details === 'function' ? entry.details(p) : entry.details,
    })),
  })
  // Inside a transaction a failed insert would undo the whole action, so it isn't caught there.
  if (db !== prisma) { await write(); return }
  try {
    await write()
  } catch (err) {
    logger.error('could not write the participant history', { action: entry.action, err })
  }
}

/** Snapshot, change, log — for the simple cases. */
export async function logged<T>(
  ids: (string | null | undefined)[],
  entry: Parameters<typeof writeParticipantLog>[1],
  change: () => Promise<T>,
): Promise<T> {
  const people = await snapshotParticipants(ids)
  const result = await change()
  await writeParticipantLog(people, entry)
  return result
}
