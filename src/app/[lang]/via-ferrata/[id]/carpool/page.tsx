import { notFound } from 'next/navigation'
import EventCarpoolPage from '@/components/events/EventCarpoolPage'
import { hasLocale } from '@/lib/i18n'

export default async function ViaFerrataCarpoolPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()
  return <EventCarpoolPage lang={lang} id={id} type="via_ferrata" />
}
