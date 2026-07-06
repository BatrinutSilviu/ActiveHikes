import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Providers from '@/components/Providers'
import { hasLocale, defaultLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'ActiveHikes',
  description: 'Group hike management — explore, join, and remember every trail.',
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
          © {new Date().getFullYear()} <span className="font-semibold text-stone-600">ActiveHikes</span>
          {' · '}
          {lang === 'ro' ? 'Cu dragoste pentru munți' : 'Made with love for the mountains'}
        </div>
      </footer>
    </Providers>
  )
}
