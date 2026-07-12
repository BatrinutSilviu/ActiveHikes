import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import OnboardingForm from '@/components/auth/OnboardingForm'

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [session, d, { callbackUrl }] = await Promise.all([
    getServerSession(authOptions),
    getDictionary(lang),
    searchParams,
  ])
  if (!session) redirect(`/${lang}/auth/login`)

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, phone: true } })
  if (user?.phone) redirect(callbackUrl || `/${lang}`)

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight text-white">{d.auth.onboarding.title}</h1>
          <p className="text-stone-400 text-sm mt-1.5">{d.auth.onboarding.subtitle}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/60 border border-stone-100 p-8">
          <OnboardingForm
            initialName={user?.name ?? ''}
            lang={lang}
            callbackUrl={callbackUrl || `/${lang}`}
            dict={d.auth.onboarding}
          />
        </div>
      </div>
    </div>
  )
}
