import { redirect } from 'next/navigation'

export default async function NewViaFerrataRedirect({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  redirect(`/${lang}/admin/hikes/new?type=via_ferrata`)
}
