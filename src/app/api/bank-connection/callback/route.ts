import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { exchangeAuthorizationCode } from '@/lib/revolutSync'

const CONSENT_VALID_DAYS = 90

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const origin = process.env.NEXTAUTH_URL

  if (!session || session.user.role !== 'admin') {
    return NextResponse.redirect(`${origin}/ro/admin/bank-accounts?bankError=1`)
  }

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')

  // Enable Banking's docs only confirm `code` is appended to the redirect —
  // `state` isn't documented as guaranteed, so fall back to the most recent
  // pending connection (there's only ever one admin doing this) if it's absent.
  const connection = code
    ? await prisma.bankConnection.findFirst({
        where: { status: 'pending', ...(state ? { reference: state } : {}) },
        orderBy: { createdAt: 'desc' },
      })
    : null

  if (!connection || !code) {
    return NextResponse.redirect(`${origin}/ro/admin/bank-accounts?bankError=1`)
  }

  try {
    const { sessionId, accountId } = await exchangeAuthorizationCode(code)

    if (accountId) {
      const now = new Date()
      await prisma.bankConnection.update({
        where: { id: connection.id },
        data: {
          status: 'linked',
          sessionId,
          accountId,
          linkedAt: now,
          consentExpiresAt: new Date(now.getTime() + CONSENT_VALID_DAYS * 24 * 60 * 60 * 1000),
        },
      })
      return NextResponse.redirect(`${origin}/ro/admin/bank-accounts?connected=1`)
    }

    await prisma.bankConnection.update({ where: { id: connection.id }, data: { status: 'expired' } })
    return NextResponse.redirect(`${origin}/ro/admin/bank-accounts?bankError=1`)
  } catch {
    return NextResponse.redirect(`${origin}/ro/admin/bank-accounts?bankError=1`)
  }
}
