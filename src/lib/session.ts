import 'server-only'
import { getServerSession, type Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

/** The signed-in user's session if they are an admin, otherwise null. */
export async function getAdminSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions)
  return session?.user.role === 'admin' ? session : null
}

/** Guard for admin-only server actions: the admin's session, or an 'Unauthorized' error. */
export async function requireAdmin(): Promise<Session> {
  const session = await getAdminSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

/**
 * Who may manage an event (its participants, details, status and chat as the organisers): the admins,
 * and for an event a community member made (Hike.byMember), the member who made it.
 * The session and whether it's an admin's, or null for anyone else (or an unknown event).
 */
export async function getEventManagerSession(hikeId: string): Promise<{ session: Session; isAdmin: boolean } | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  if (session.user.role === 'admin') return { session, isAdmin: true }
  const event = await prisma.hike.findUnique({ where: { id: hikeId }, select: { byMember: true, createdById: true } })
  return event?.byMember && event.createdById === session.user.id ? { session, isAdmin: false } : null
}

/** Guard for actions on one event: the admin's or its organiser's session, or an 'Unauthorized' error. */
export async function requireEventManager(hikeId: string): Promise<Session> {
  const manager = await getEventManagerSession(hikeId)
  if (!manager) throw new Error('Unauthorized')
  return manager.session
}
