import { redirect } from 'next/navigation'

export default async function AdminHikeRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/ro/admin/hikes/${id}`)
}
