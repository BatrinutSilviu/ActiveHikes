import './globals.css'
import { headers } from 'next/headers'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const locale = h.get('x-locale') ?? 'ro'
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-screen flex flex-col bg-stone-50">
        {children}
      </body>
    </html>
  )
}
