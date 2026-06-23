'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import path from 'path'
import { revalidateLocalePaths } from '@/lib/i18n'

export async function addPhoto(hikeId: string, url: string, caption?: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  await prisma.hikePhoto.create({
    data: { hikeId, url, caption: caption || null, uploadedById: session.user.id },
  })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}

export async function deletePhoto(photoId: string, hikeId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const photo = await prisma.hikePhoto.findUnique({ where: { id: photoId } })
  if (!photo) return

  // Delete file from disk
  try {
    const relativePath = photo.url.startsWith('/') ? photo.url.slice(1) : photo.url
    await unlink(path.join(process.cwd(), 'public', relativePath))
  } catch {
    // File may not exist — continue
  }

  await prisma.hikePhoto.delete({ where: { id: photoId } })
  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
}
