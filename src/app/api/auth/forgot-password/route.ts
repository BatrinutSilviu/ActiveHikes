import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendPasswordResetEmail } from '@/lib/mailer'
import { generateResetToken, RESET_TOKEN_TTL_MS } from '@/lib/passwordReset'
import { allow, clientIp, normalizeEmail } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = normalizeEmail(body.email)
  const lang = body.lang

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }
  // At most one email every 2 minutes (5 an hour) per address, and 10 an hour per client — so this
  // can't be used to flood someone's inbox. The answer is the same either way.
  const sendAllowed = await allow(`reset:ip:${clientIp(req.headers)}`, 10, 60 * 60_000)
    && await allow(`reset:email:${email}:2m`, 1, 2 * 60_000)
    && await allow(`reset:email:${email}:1h`, 5, 60 * 60_000)
  if (!sendAllowed) return NextResponse.json({ ok: true })

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })

  // Always respond the same way whether or not the account exists, so this
  // endpoint can't be used to check which emails are registered.
  if (user && user.password) {
    const { rawToken, hashedToken } = generateResetToken()

    await prisma.verificationToken.deleteMany({ where: { identifier: user.email! } })
    await prisma.verificationToken.create({
      data: { identifier: user.email!, token: hashedToken, expires: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    })

    const resetUrl = `${process.env.NEXTAUTH_URL}/${lang === 'en' ? 'en' : 'ro'}/auth/reset-password?token=${rawToken}`
    try {
      await sendPasswordResetEmail(user.email!, resetUrl)
    } catch (err) {
      // Don't let an email provider outage turn into a 500 here — that would
      // leak account existence (registered emails would fail, others wouldn't).
      logger.error('password reset email failed', { route: 'POST /api/auth/forgot-password', err })
    }
  }

  return NextResponse.json({ ok: true })
}
