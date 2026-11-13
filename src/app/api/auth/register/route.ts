import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { allow, clientIp, isEmail, normalizeEmail } from '@/lib/rateLimit'

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export async function POST(req: NextRequest) {
  if (!allow(`register:ip:${clientIp(req.headers)}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many sign-ups from here — try again later.' }, { status: 429 })
  }
  const body = await req.json().catch(() => ({}))
  const name = text(body.name)
  const email = normalizeEmail(body.email)
  const phone = text(body.phone)
  const password = typeof body.password === 'string' ? body.password : ''

  if (!name || !email || !password || !phone) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (name.length > 100 || phone.length > 30) {
    return NextResponse.json({ error: 'The name or phone number is too long.' }, { status: 400 })
  }
  if (name.split(/\s+/).length < 2) {
    return NextResponse.json({ error: 'Please enter your full name (first and last).' }, { status: 400 })
  }
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  // Older accounts may have been saved with capitals in their email.
  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  await prisma.user.create({
    data: { name, email, password: await bcrypt.hash(password, 12), phone, role: 'user' },
  })

  return NextResponse.json({ ok: true })
}
