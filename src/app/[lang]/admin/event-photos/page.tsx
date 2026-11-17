import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { eventCategories } from '@/lib/eventCategories'
import { allCategoryCovers } from '@/lib/categoryCovers'
import EventPhotosClient from './client'

// Default cover photo per kind of general event, used when an event is created without one.
export default async function EventPhotosPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [d, { categories }, covers] = await Promise.all([getDictionary(lang), eventCategories(), allCategoryCovers()])
  const dp = d.admin.eventPhotos

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href={`/${lang}/admin`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {d.admin.viaFerrata.backToDashboard}
      </Link>
      <h1 className="text-3xl font-black tracking-tight text-stone-900">{dp.title}</h1>
      <p className="text-stone-500 mt-1 mb-8 text-sm max-w-2xl">{dp.subtitle}</p>
      {categories.length === 0
        ? <p className="text-stone-500">{dp.noCategories}</p>
        : <EventPhotosClient categories={categories} covers={covers} dict={dp} />}
    </div>
  )
}
