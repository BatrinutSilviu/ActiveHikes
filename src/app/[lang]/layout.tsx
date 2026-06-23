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
      <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
        © {new Date().getFullYear()} ActiveHikes · {lang === 'ro' ? 'Cu ❤️ pentru munți' : 'Made with ❤️ for the mountains'}
      </footer>
    </Providers>
  )
}
