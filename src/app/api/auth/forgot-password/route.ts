import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/mailer'
import { generateResetToken, RESET_TOKEN_TTL_MS } from '@/lib/passwordReset'

export async function POST(req: NextRequest) {
  const { email, lang } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Always respond the same way whether or not the account exists, so this
  // endpoint can't be used to check which emails are registered.
  if (user && user.password) {
    const { rawToken, hashedToken } = generateResetToken()

    await prisma.verificationToken.deleteMany({ where: { identifier: email } })
    await prisma.verificationToken.create({
      data: { identifier: email, token: hashedToken, expires: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    })

    const resetUrl = `${process.env.NEXTAUTH_URL}/${lang === 'en' ? 'en' : 'ro'}/auth/reset-password?token=${rawToken}`
    try {
      await sendPasswordResetEmail(email, resetUrl)
    } catch (err) {
      // Don't let an email provider outage turn into a 500 here — that would
      // leak account existence (registered emails would fail, others wouldn't).
      console.error('Failed to send password reset email:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
