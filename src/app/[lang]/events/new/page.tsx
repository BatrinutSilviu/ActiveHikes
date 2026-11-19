import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDictionary, hasLocale } from '@/lib/i18n'
import EventForm from '@/components/generalEvents/EventForm'
import { eventCategories } from '@/lib/eventCategories'

// Any signed-in member makes their own event here: a free general event (Running, Football…) that is
// live as soon as it's created (see actions/memberEvents.ts). Admins make theirs from /admin/events/new.
export default async function NewMemberEventPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const session = await getServerSession(authOptions)
  if (!session) redirect(`/${lang}/auth/login?callbackUrl=${encodeURIComponent(`/${lang}/events/new`)}`)

  const [d, categories] = await Promise.all([getDictionary(lang), eventCategories()])
  const dm = d.events.member

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/${lang}/events`} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> {d.events.list.title}
      </Link>
      <h1 className="text-3xl font-black tracking-tight text-stone-900">{dm.createTitle}</h1>
      <p className="text-stone-500 mt-1 mb-6 text-sm">{dm.createSubtitle}</p>
      <EventForm
        member
        {...categories}
        lang={lang}
        dict={{ ...d.events.admin.form, categoryHint: dm.categoryHint, create: dm.create, createdHint: dm.createdHint }}
      />
    </div>
  )
}
