import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, Wallet } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const d = await getDictionary(lang)
  const t = d.terms

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/${lang}`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> ActiveHikes
      </Link>

      <h1 className="text-3xl font-bold text-stone-900 mb-2">{t.title}</h1>
      <p className="text-stone-500 mb-8">{t.intro}</p>

      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-stone-800 mb-3">
          <ShieldAlert size={18} className="text-amber-600" /> {t.liabilityTitle}
        </h2>
        <p className="text-stone-600 leading-relaxed">{t.liabilityText}</p>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold text-stone-800 mb-3">
          <Wallet size={18} className="text-emerald-600" /> {t.refundTitle}
        </h2>
        <p className="text-stone-600 mb-3">{t.refundIntro}</p>
        <ul className="space-y-2 text-stone-600 list-disc list-inside leading-relaxed">
          <li>{t.refundWaitlist}</li>
          <li>{t.refundNoWaitlist}</li>
        </ul>
      </section>
    </div>
  )
}
