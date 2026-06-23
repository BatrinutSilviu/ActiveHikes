import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

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

  if (isProtected) {
    const token = await getToken({ req: request })
    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}/auth/login`
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
    if (pathname.startsWith(`/${locale}/admin`) && token.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}`
      return NextResponse.redirect(url)
    }
  }

  const res = NextResponse.next()
  res.headers.set('x-locale', locale)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
