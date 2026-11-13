import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { findChatEvent, isChatOpen } from '@/lib/eventChat'

// Deleting a chat message: admins any time, anyone else their own while the chat is open.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { id, messageId } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const [event, message] = await Promise.all([
    findChatEvent(id),
    prisma.eventChatMessage.findFirst({ where: { id: messageId, hikeId: id }, select: { userId: true, fromAdmin: true } }),
  ])
  if (!event || !message) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = session.user.role === 'admin'
  const ownWhileOpen = message.userId === session.user.id && !message.fromAdmin && isChatOpen(event)
  if (!isAdmin && !ownWhileOpen) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  await prisma.eventChatMessage.delete({ where: { id: messageId } })
  return NextResponse.json({ ok: true })
}
