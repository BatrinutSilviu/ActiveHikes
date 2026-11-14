import 'server-only'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendEmailConfirmation } from '@/lib/mailer'
import { generateResetToken } from '@/lib/passwordReset'

// Confirmation links share the VerificationToken table with password resets (same random token,
// only its SHA-256 hash stored). Their identifier carries this prefix so the two kinds never mix:
// a reset link can't confirm an email and a confirmation link can't reset a password.
export const VERIFY_PREFIX = 'verify-email:'
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/** Emails a fresh confirmation link to `email`, replacing any earlier one. Never throws. */
export async function sendVerificationLink(email: string, lang: string) {
  const locale = lang === 'en' ? 'en' : 'ro'
  const identifier = VERIFY_PREFIX + email
  const { rawToken, hashedToken } = generateResetToken()
  try {
    await prisma.verificationToken.deleteMany({ where: { identifier } })
    await prisma.verificationToken.create({
      data: { identifier, token: hashedToken, expires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS) },
    })
    const url = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${rawToken}&lang=${locale}`
    await sendEmailConfirmation(email, url, locale)
  } catch (err) {
    // The account stays unconfirmed; the login page offers to send the link again.
    logger.error('email confirmation failed', { job: 'email', err })
  }
}
