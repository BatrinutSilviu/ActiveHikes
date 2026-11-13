import 'server-only'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/db'
import { eventEndsAt } from '@/lib/dates'

// The chat of a general event (see EventChatMessage): who may read and write it, and when it's open.
// Open from when the event is published until a day after it ends; a draft's chat is the organisers' only.
// Its participants (signed up, waiting or confirmed — not rejected) and the admins take part.

export const CHAT_PAGE = 30
export const CHAT_MAX_LENGTH = 1000
// At most this many messages a minute from one person.
const RATE_PER_MINUTE = 10

type ChatEvent = {
  id: string
  type: string
  status: string
  date: Date
  endDate: Date | null
  meetingTime: string | null
  durationHours: { toString(): string } | null
}

export async function findChatEvent(id: string): Promise<ChatEvent | null> {
  return prisma.hike.findFirst({
    where: { id, type: 'event' },
    select: { id: true, type: true, status: true, date: true, endDate: true, meetingTime: true, durationHours: true },
  })
}

export function chatClosesAt(event: ChatEvent): Date {
  return new Date(eventEndsAt(event.date, event.endDate, event).getTime() + 24 * 3600_000)
}

export function isChatOpen(event: ChatEvent): boolean {
  return event.status !== 'draft' && Date.now() < chatClosesAt(event).getTime()
}

/** Whether this viewer takes part in the chat: an admin, or someone on the event's list. */
export async function canUseChat(event: ChatEvent, session: Session | null): Promise<boolean> {
  if (!session?.user?.id) return false
  if (session.user.role === 'admin') return true
  if (event.status === 'draft') return false
  const participation = await prisma.hikeParticipant.findUnique({
    where: { hikeId_userId: { hikeId: event.id, userId: session.user.id } },
    select: { status: true },
  })
  return !!participation && participation.status !== 'rejected'
}

const messageSelect = {
  id: true,
  body: true,
  fromAdmin: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
} as const

/** A page of messages, oldest first: the newest ones, or those before the message `before`. */
export async function chatPage(eventId: string, before?: string) {
  const cursor = before
    ? await prisma.eventChatMessage.findFirst({ where: { id: before, hikeId: eventId }, select: { createdAt: true, id: true } })
    : null
  const rows = await prisma.eventChatMessage.findMany({
    where: {
      hikeId: eventId,
      ...(cursor && {
        OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }],
      }),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: CHAT_PAGE + 1,
    select: messageSelect,
  })
  return { messages: rows.slice(0, CHAT_PAGE).reverse(), hasMore: rows.length > CHAT_PAGE }
}

export async function sentInLastMinute(eventId: string, userId: string): Promise<boolean> {
  const count = await prisma.eventChatMessage.count({
    where: { hikeId: eventId, userId, createdAt: { gt: new Date(Date.now() - 60_000) } },
  })
  return count >= RATE_PER_MINUTE
}
