'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import path from 'path'
import { revalidateLocalePaths } from '@/lib/i18n'

export async function addDocument(hikeId: string, url: string, name: string, requiresUpload: boolean) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  await prisma.hikeDocument.create({
    data: { hikeId, url, name, requiresUpload },
  })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
}

export async function setDocumentRequiresUpload(documentId: string, hikeId: string, requiresUpload: boolean) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  await prisma.hikeDocument.update({ where: { id: documentId }, data: { requiresUpload } })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
}

export async function renameDocument(documentId: string, hikeId: string, name: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Name is required')

  await prisma.hikeDocument.update({ where: { id: documentId }, data: { name: trimmedName } })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
}

export async function deleteDocument(documentId: string, hikeId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const document = await prisma.hikeDocument.findUnique({ where: { id: documentId } })
  if (!document) return

  try {
    const relativePath = document.url.startsWith('/') ? document.url.slice(1) : document.url
    await unlink(path.join(process.cwd(), 'public', relativePath))
  } catch {
    // File may not exist — continue
  }

  await prisma.hikeDocument.delete({ where: { id: documentId } })
  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
}
