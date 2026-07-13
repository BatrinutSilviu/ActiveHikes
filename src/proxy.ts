import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/db'

const LOCALES = ['en', 'ro'] as const
type Locale = typeof LOCALES[number]
const DEFAULT: Locale = 'ro'

function detectLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get('NEXT_LOCALE')?.value
  if (cookie === 'en' || cookie === 'ro') return cookie
  const accept = req.headers.get('accept-language') ?? ''
  return accept.toLowerCase().startsWith('ro') ? 'ro' : DEFAULT
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) return NextResponse.next()

  const hasLocale = LOCALES.some(l => pathname === `/${l}` || pathname.startsWith(`/${l}/`))

  if (!hasLocale) {
    const locale = detectLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname}`
    return NextResponse.redirect(url)
  }

  const locale = pathname.split('/')[1] as Locale
  const isProtected = pathname.startsWith(`/${locale}/admin`) || pathname.startsWith(`/${locale}/profile`)
  const isAuthPage = pathname.startsWith(`/${locale}/auth/`)
  const isOnboardingPage = pathname.startsWith(`/${locale}/onboarding`)

  if (!isAuthPage && !isOnboardingPage) {
    const token = await getToken({ req: request })

    if (isProtected && !token) {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}/auth/login`
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
    if (isProtected && pathname.startsWith(`/${locale}/admin`) && token?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}`
      return NextResponse.redirect(url)
    }
    // Every signed-in user must have a phone on file before using the app further.
    // The JWT's `phone` claim only refreshes on login or an explicit client-side
    // session update, so a session that predates onboarding completion (e.g. a
    // second tab/device) can carry a stale "no phone" claim forever. Falling back
    // to the DB here avoids bouncing that session between the target page and
    // onboarding — which otherwise loops until the browser gives up with
    // "too many redirects".
    if (token && !token.phone) {
      const dbUser = await prisma.user.findUnique({ where: { id: token.id as string }, select: { phone: true } })
      if (!dbUser?.phone) {
        const url = request.nextUrl.clone()
        url.pathname = `/${locale}/onboarding`
        url.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(url)
      }
    }
  }

  const res = NextResponse.next()
  res.headers.set('x-locale', locale)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
