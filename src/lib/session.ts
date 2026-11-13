import 'server-only'
import { getServerSession, type Session } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
