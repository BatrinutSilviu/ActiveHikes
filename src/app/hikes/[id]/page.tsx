import { redirect } from 'next/navigation'

export default async function HikeDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/ro/hikes/${id}`)
}
