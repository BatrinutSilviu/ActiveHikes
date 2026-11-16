import { redirect } from 'next/navigation'

// Every kind of event is created from New event now; this keeps old links working.
export default async function NewHikeRedirect({ params, searchParams }: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ type?: string }>
}) {
  const [{ lang }, { type }] = await Promise.all([params, searchParams])
  redirect(`/${lang}/admin/events/new?type=${type === 'via_ferrata' ? 'via_ferrata' : 'hike'}`)
}
