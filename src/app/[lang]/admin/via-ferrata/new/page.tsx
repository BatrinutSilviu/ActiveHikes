import { redirect } from 'next/navigation'

// Every kind of event is created from New event now; this keeps old links working.
export default async function NewViaFerrataRedirect({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  redirect(`/${lang}/admin/events/new?type=via_ferrata`)
}
