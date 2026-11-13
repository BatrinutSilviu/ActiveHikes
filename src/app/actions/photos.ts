'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'
import { requireAdmin } from '@/lib/session'
import { removeUpload } from '@/lib/uploadStorage'

export async function addPhoto(hikeId: string, url: string, caption?: string) {
  const session = await requireAdmin()

  await prisma.hikePhoto.create({
    data: { hikeId, url, caption: caption || null, uploadedById: session.user.id },
  })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}

export async function deletePhoto(photoId: string, hikeId: string) {
  await requireAdmin()

  const photo = await prisma.hikePhoto.findUnique({ where: { id: photoId } })
  if (!photo) return

  await removeUpload(photo.url)

  await prisma.hikePhoto.delete({ where: { id: photoId } })
  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}
