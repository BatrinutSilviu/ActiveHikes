import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CHAT_MAX_LENGTH, canUseChat, chatClosesAt, chatPage, findChatEvent, isChatOpen, sentInLastMinute } from '@/lib/eventChat'

// A general event's chat (see lib/eventChat.ts).
// GET ?before=<message id>: a page of messages (the newest without `before`), for those taking part.
// POST { body }: write a message while the chat is open; admins write as the organisers.

const noStore = { 'Cache-Control': 'no-store' }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await findChatEvent(id)
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const session = await getServerSession(authOptions)
  const open = isChatOpen(event)
  const closesAt = chatClosesAt(event).toISOString()
  if (!(await canUseChat(event, session))) {
    return NextResponse.json({ canRead: false, open, closesAt, messages: [], hasMore: false }, { headers: noStore })
  }
  const before = req.nextUrl.searchParams.get('before') ?? undefined
  return NextResponse.json({ canRead: true, open, closesAt, ...(await chatPage(id, before)) }, { headers: noStore })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await findChatEvent(id)
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const session = await getServerSession(authOptions)
  if (!session || !(await canUseChat(event, session))) {
    return NextResponse.json({ error: 'Only the participants can write here' }, { status: 403 })
  }
  if (!isChatOpen(event)) return NextResponse.json({ error: 'The chat is closed' }, { status: 409 })

  const { body } = await req.json().catch(() => ({ body: null }))
  const text = typeof body === 'string' ? body.trim() : ''
  if (!text) return NextResponse.json({ error: 'Empty message' }, { status: 400 })
  if (text.length > CHAT_MAX_LENGTH) return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  if (await sentInLastMinute(id, session.user.id)) {
    return NextResponse.json({ error: 'Too many messages — wait a minute' }, { status: 429 })
  }

  const message = await prisma.eventChatMessage.create({
    data: { hikeId: id, userId: session.user.id, fromAdmin: session.user.role === 'admin', body: text },
    select: { id: true },
  })
  return NextResponse.json(message, { status: 201 })
}
