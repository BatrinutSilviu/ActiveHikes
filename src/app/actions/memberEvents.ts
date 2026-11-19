'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { allow } from '@/lib/rateLimit'
import { canonicalCategory } from '@/lib/eventCategories'
import { isEventPast } from '@/lib/dates'
import { requireEventManager } from '@/lib/session'
import { revalidateParticipantCountPaths } from '@/lib/revalidateHike'
import { promoteFromWaitlist } from '@/lib/memberWaitlist'
import { selfActor, snapshotParticipants, writeParticipantLog } from '@/lib/participantLog'

// Events community members make themselves (Hike.byMember), like the padel app's open matches: always
// a general event (a kind such as Running or Football), always free (no price, advance or payment
// methods), and live straight away. The member says how many people they need; they're signed up
// themselves (confirmed, taking one spot) and others join until it's full. Their creator — and the
// admins — edit them, cancel or reopen them and manage their sign-ups.

// At most this many new events a day per member, this many of theirs still to come at once, and this
// far ahead (the same limits as padel open matches).
const CREATE_PER_DAY = 5
const MAX_UPCOMING = 3
const MAX_DAYS_AHEAD = 60
const MAX_NEEDED = 499

export type MemberEventInput = {
  title: string
  category: string
  destination: string
  meetingPoint?: string | null
  description?: string | null
  date: string
  endDate?: string | null
  meetingTime?: string | null
  endTime?: string | null
  /** How many people they need besides themselves (people they bring along aren't counted). */
  peopleNeeded: number
  essentials?: string[]
  whatsappGroupUrl?: string | null
  coverImageUrl?: string | null
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function text(value: string | null | undefined, max: number, name: string, required = false): string | null {
  const v = value?.trim() ?? ''
  if (required && !v) throw new Error(`${name} is required`)
  if (v.length > max) throw new Error(`${name} is too long (at most ${max} characters)`)
  return v || null
}

/** The event's fields as they may be saved, or an error saying what's wrong. */
async function clean(data: MemberEventInput, currentCategory?: string | null) {
  const title = text(data.title, 120, 'The name', true)!
  const destination = text(data.destination, 120, 'The place', true)!
  const category = text(data.category, 60, 'The event type', true)!

  if (!DATE_RE.test(data.date)) throw new Error('Invalid date')
  const endDate = data.endDate || null
  if (endDate && (!DATE_RE.test(endDate) || endDate < data.date)) throw new Error('The end can\'t be before the start')
  if (endDate && (new Date(endDate).getTime() - new Date(data.date).getTime()) > 31 * 86_400_000) {
    throw new Error('An event can last at most a month')
  }
  const year = Number(data.date.slice(0, 4))
  if (year < 2020 || year > 2099) throw new Error('Invalid date')

  const meetingTime = data.meetingTime || null
  const endTime = data.endTime || null
  if ((meetingTime && !TIME_RE.test(meetingTime)) || (endTime && !TIME_RE.test(endTime))) throw new Error('Invalid time')
  const singleDay = !endDate || endDate === data.date
  if (singleDay && meetingTime && endTime && toMinutes(endTime) <= toMinutes(meetingTime)) {
    throw new Error('The end can\'t be before the start')
  }
  // A single-day event's length comes from its times, so it's marked as over when it ends.
  const durationHours = singleDay && meetingTime && endTime
    ? Math.round((toMinutes(endTime) - toMinutes(meetingTime)) / 6) / 10 : null

  const peopleNeeded = Math.floor(Number(data.peopleNeeded))
  if (!(peopleNeeded >= 1 && peopleNeeded <= MAX_NEEDED)) throw new Error(`You can ask for 1 to ${MAX_NEEDED} people`)
  // The organiser holds one of the spots.
  const maxParticipants = peopleNeeded + 1

  const whatsappGroupUrl = text(data.whatsappGroupUrl, 200, 'The WhatsApp link')
  if (whatsappGroupUrl && !whatsappGroupUrl.startsWith('https://chat.whatsapp.com/')) {
    throw new Error('The WhatsApp link must start with https://chat.whatsapp.com/')
  }
  // Only a photo uploaded here (the upload endpoint checks it's really an image).
  const coverImageUrl = data.coverImageUrl || null
  if (coverImageUrl && !/^\/uploads\/hike-covers\/[\w.-]+$/.test(coverImageUrl)) throw new Error('Invalid cover photo')

  const essentials = (data.essentials ?? []).map(s => s.trim()).filter(Boolean).slice(0, 30).map(s => s.slice(0, 120))

  return {
    title,
    destination,
    // One of the management app's event types, spelled as it spells it (an unchanged one is kept as is).
    category: currentCategory?.toLowerCase() === category.toLowerCase() ? currentCategory : await canonicalCategory(category),
    meetingPoint: text(data.meetingPoint, 200, 'The address'),
    description: text(data.description, 4000, 'The description'),
    date: new Date(data.date),
    endDate: endDate && endDate !== data.date ? new Date(endDate) : null,
    meetingTime,
    endTime,
    durationHours,
    maxParticipants,
    essentials,
    whatsappGroupUrl,
    coverImageUrl,
  }
}

/** A signed-in member makes a free event; it's live at once. Returns its id. */
export async function createMemberEvent(data: MemberEventInput): Promise<string> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error('Not authenticated')
  if (!session.user.name?.trim()) throw new Error('Add your name to your profile first')

  const fields = await clean(data)
  if (isEventPast(fields.date, fields.endDate, fields)) throw new Error('The event can\'t be in the past')
  if (fields.date.getTime() > Date.now() + MAX_DAYS_AHEAD * 86_400_000) {
    throw new Error(`Events can be set up at most ${MAX_DAYS_AHEAD} days ahead`)
  }

  const upcoming = await prisma.hike.count({
    where: { createdById: session.user.id, byMember: true, status: { in: ['upcoming', 'ongoing'] }, date: { gte: new Date(Date.now() - 86_400_000) } },
  })
  if (upcoming >= MAX_UPCOMING) throw new Error(`You already have ${upcoming} upcoming events — cancel one or wait until one is over`)
  if (!(await allow(`member-event:${session.user.id}`, CREATE_PER_DAY, 86_400_000))) {
    throw new Error('Too many new events today — try again tomorrow')
  }

  const event = await prisma.hike.create({
    data: {
      ...fields,
      type: 'event',
      byMember: true,
      status: 'upcoming',
      entryFee: 0,
      advanceFee: null,
      createdById: session.user.id,
      // The organiser is in from the start.
      participants: { create: { userId: session.user.id, status: 'confirmed', confirmedAt: new Date() } },
    },
    select: { id: true, participants: { select: { id: true } } },
  })
  await writeParticipantLog(await snapshotParticipants(event.participants.map(p => p.id)), { action: 'joined', actor: selfActor, fresh: true })
  revalidateParticipantCountPaths(event.id)
  return event.id
}

/** Its organiser (or an admin) changes a member's event. It stays free. */
export async function updateMemberEvent(id: string, data: MemberEventInput) {
  await requireEventManager(id)
  const current = await prisma.hike.findUnique({ where: { id }, select: { byMember: true, category: true } })
  if (!current?.byMember) throw new Error('Not a member event')

  const fields = await clean(data, current.category)
  await prisma.hike.update({ where: { id }, data: fields })
  // More spots: the waitlist moves up into them.
  await promoteFromWaitlist(id)
  revalidateParticipantCountPaths(id)
}

/** Its organiser (or an admin) cancels a member's event, or takes the cancellation back before it happens. */
export async function setMemberEventCancelled(id: string, cancelled: boolean) {
  await requireEventManager(id)
  const event = await prisma.hike.findUnique({
    where: { id },
    select: { byMember: true, date: true, endDate: true, meetingTime: true, durationHours: true },
  })
  if (!event?.byMember) throw new Error('Not a member event')
  if (!cancelled && isEventPast(event.date, event.endDate, event)) throw new Error('The event is already over')

  await prisma.hike.update({ where: { id }, data: { status: cancelled ? 'cancelled' : 'upcoming' } })
  revalidateParticipantCountPaths(id)
}
