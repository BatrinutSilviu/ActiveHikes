import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendVerificationLink } from '@/lib/emailVerification'
import { allow, clientIp, normalizeEmail } from '@/lib/rateLimit'

// "Send the confirmation email again" from the login page. Same answer whatever happens, so it can't
// be used to find out which addresses have accounts.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = normalizeEmail(body.email)
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

  // Same limits as password resets: can't be used to flood someone's inbox.
  const sendAllowed = await allow(`verify:ip:${clientIp(req.headers)}`, 10, 60 * 60_000)
    && await allow(`verify:email:${email}:2m`, 1, 2 * 60_000)
    && await allow(`verify:email:${email}:1h`, 5, 60 * 60_000)
  if (!sendAllowed) return NextResponse.json({ ok: true })

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { email: true, password: true, emailVerified: true },
  })
  if (user?.email && user.password && !user.emailVerified) await sendVerificationLink(user.email, body.lang)

  return NextResponse.json({ ok: true })
}
