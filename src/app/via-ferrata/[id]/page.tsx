import { redirect } from 'next/navigation'

export default async function ViaFerrataDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/ro/via-ferrata/${id}`)
}
