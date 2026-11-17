import Link from 'next/link'
import BrandMark from '@/components/BrandMark'

/** Dark full-screen frame with the logo and a heading, shared by the login/sign-up/password pages. */
export default function AuthShell({
  lang,
  title,
  subtitle,
  children,
}: {
  lang: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
      <div className="w-full max-w-sm relative">

        {/* Brand header */}
        <div className="text-center mb-8">
          <Link href={`/${lang}`} aria-label="act!ve Events" className="inline-flex items-center justify-center mb-6">
            <BrandMark size="lg" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white">{title}</h1>
          <p className="text-stone-400 text-sm mt-1.5">{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  )
}
