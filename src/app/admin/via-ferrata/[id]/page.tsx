import { redirect } from 'next/navigation'

export default async function AdminViaFerrataRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/ro/admin/via-ferrata/${id}`)
}
