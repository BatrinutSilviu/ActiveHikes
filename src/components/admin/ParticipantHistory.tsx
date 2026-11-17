import { prisma } from '@/lib/db'
import type { Dictionary } from '@/lib/i18n'
import ParticipantHistoryList, { type HistoryPerson } from './ParticipantHistoryList'

// The admin's view of the participant history (lib/participantLog): one row per person who ever
// signed up for the event, with everything that happened to their sign-up, oldest first.
export default async function ParticipantHistory({ hikeId, dict, locale }: { hikeId: string; dict: Dictionary; locale: string }) {
  const [entries, current] = await Promise.all([
    prisma.participantLog.findMany({ where: { hikeId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
    prisma.hikeParticipant.findMany({ where: { hikeId }, select: { id: true, userId: true, status: true } }),
  ])

  // A person is their account when they have one (so someone who left and signed up again is one
  // person), else the sign-up itself (a friend, or someone added without an account).
  const byUser = new Map(current.filter(c => c.userId).map(c => [c.userId!, c.status]))
  const byId = new Map(current.map(c => [c.id, c.status]))
  const people = new Map<string, HistoryPerson>()
  for (const e of entries) {
    const key = e.userId ? `u:${e.userId}` : `p:${e.participantId ?? e.id}`
    let person = people.get(key)
    if (!person) {
      person = { key, name: e.personName, friendOf: e.friendOf, current: null, gone: null, entries: [] }
      people.set(key, person)
    }
    person.name = e.personName // the latest name they had
    person.entries.push({
      id: e.id,
      at: e.createdAt.toISOString(),
      action: e.action,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actor: e.actor,
      actorName: e.actorName,
      details: (e.details ?? null) as Record<string, unknown> | null,
    })
  }
  for (const person of people.values()) {
    const last = person.entries[person.entries.length - 1]
    const ids = person.key.startsWith('u:') ? null : person.key.slice(2)
    person.current = person.key.startsWith('u:') ? byUser.get(person.key.slice(2)) ?? null : byId.get(ids!) ?? null
    if (!person.current) person.gone = last?.action === 'removed' ? 'removed' : 'dropped'
  }

  // Most recent activity first.
  const list = [...people.values()].sort((a, b) =>
    b.entries[b.entries.length - 1].at.localeCompare(a.entries[a.entries.length - 1].at))

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-stone-800">{dict.admin.participantLog.title}</h2>
      <p className="text-sm text-stone-500 mt-1 mb-4">{dict.admin.participantLog.subtitle}</p>
      <ParticipantHistoryList people={list} dict={dict.admin.participantLog} statusLabels={dict.admin.viaFerrata.status} locale={locale} />
    </section>
  )
}
