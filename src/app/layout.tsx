import './globals.css'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const locale = h.get('x-locale') ?? 'ro'
  return (
    <html lang={locale} className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-stone-50">
        {children}
      </body>
    </html>
  )
}
