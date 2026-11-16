import { redirect } from 'next/navigation'

// All kinds of event are listed together on /events now; this keeps old links working.
export default async function OldListRedirect({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  redirect(`/${lang}/events?type=hike`)
}
