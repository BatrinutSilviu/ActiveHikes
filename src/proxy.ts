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

// Content Security Policy with a fresh nonce per request: only scripts carrying the nonce (Next adds
// it to its own scripts by reading this header during rendering) or loaded by them ('strict-dynamic')
// may run, so injected inline scripts don't. Every page is rendered per request already (the root
// layout reads headers()), so nonces cost no caching. Styles still allow inline: React style
// attributes and Leaflet's positioning rely on them. Eval only in development (React's debugging).
function contentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV !== 'production'
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = contentSecurityPolicy(nonce)
  // Next reads the nonce from the request's CSP header; the browser enforces the response's.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('Content-Security-Policy', csp)
  const next = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set('Content-Security-Policy', csp)
    return res
  }

  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) return next()

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

  const res = next()
  res.headers.set('x-locale', locale)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
