import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashResetToken } from '@/lib/passwordReset'
import { VERIFY_PREFIX } from '@/lib/emailVerification'

// The link from the confirmation email: marks the address as confirmed and sends the user to the
// login page, which says whether it worked.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'ro'
  const done = (result: 'ok' | 'invalid') =>
    NextResponse.redirect(new URL(`/${lang}/auth/login?verified=${result}`, process.env.NEXTAUTH_URL || req.url))

  if (!token) return done('invalid')
  const hashedToken = hashResetToken(token)
  const row = await prisma.verificationToken.findUnique({ where: { token: hashedToken } })
  if (!row || !row.identifier.startsWith(VERIFY_PREFIX)) return done('invalid')

  // Single use: whoever deletes the row gets to use it (guards against a double click racing).
  const { count } = await prisma.verificationToken.deleteMany({ where: { token: hashedToken } })
  if (count !== 1 || row.expires < new Date()) return done('invalid')

  const email = row.identifier.slice(VERIFY_PREFIX.length)
  await prisma.user.updateMany({ where: { email, emailVerified: null }, data: { emailVerified: new Date() } })
  return done('ok')
}
