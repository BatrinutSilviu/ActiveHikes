import Image from 'next/image'
import Link from 'next/link'

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
          <Link href={`/${lang}`} className="inline-flex items-center justify-center mb-6">
            {/* Served as-is (unoptimized): it's a small static PNG, and its intrinsic size reserves the space. */}
            <Image src="/logo.png" alt="Active Hikes" width={512} height={118} className="h-10 w-auto" unoptimized priority />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white">{title}</h1>
          <p className="text-stone-400 text-sm mt-1.5">{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  )
}
