import { redirect } from 'next/navigation'

export default async function AllViaFerrataParticipantsRedirect({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  redirect(`/${lang}/admin/participants`)
}
