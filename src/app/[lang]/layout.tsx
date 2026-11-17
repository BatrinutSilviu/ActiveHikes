import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { BRAND_NAME } from '@/components/BrandMark'
import Providers from '@/components/Providers'
import { hasLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: 'Sports, hikes, via ferratas and community events in Timișoara — see what\'s coming up and sign up.',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  return (
    <Providers>
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-stone-200/60 py-8 text-center">
        <div className="text-sm text-stone-400">
          © {new Date().getFullYear()} <span className="font-semibold text-stone-600">{BRAND_NAME}</span>
          {' · '}
          {lang === 'ro' ? 'Sport, natură și oameni faini' : 'Sports, nature and good company'}
          {' · '}
          <Link href={`/${lang}/terms`} className="hover:text-stone-600 hover:underline">
            {lang === 'ro' ? 'Termeni și condiții' : 'Terms & Conditions'}
          </Link>
        </div>
      </footer>
    </Providers>
  )
}
