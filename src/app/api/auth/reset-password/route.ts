import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { hashResetToken } from '@/lib/passwordReset'
import { VERIFY_PREFIX } from '@/lib/emailVerification'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token || !password) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const hashedToken = hashResetToken(token)
  const verificationToken = await prisma.verificationToken.findUnique({ where: { token: hashedToken } })

  // Email confirmation links live in the same table; they can't be used to set a password.
  if (!verificationToken || verificationToken.expires < new Date() || verificationToken.identifier.startsWith(VERIFY_PREFIX)) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    // The link arrived in this inbox, so the address is confirmed too.
    data: { password: hashed, emailVerified: new Date() },
  })
  await prisma.verificationToken.delete({ where: { token: hashedToken } })

  return NextResponse.json({ ok: true })
}
