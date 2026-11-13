'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import path from 'path'
import { revalidateLocalePaths } from '@/lib/i18n'
import { requireAdmin } from '@/lib/session'

export async function addDocument(hikeId: string, url: string, name: string, requiresUpload: boolean) {
  await requireAdmin()

  await prisma.hikeDocument.create({
    data: { hikeId, url, name, requiresUpload },
  })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
}

export async function setDocumentRequiresUpload(documentId: string, hikeId: string, requiresUpload: boolean) {
  await requireAdmin()

  await prisma.hikeDocument.update({ where: { id: documentId }, data: { requiresUpload } })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
}

export async function renameDocument(documentId: string, hikeId: string, name: string) {
  await requireAdmin()

  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Name is required')

  await prisma.hikeDocument.update({ where: { id: documentId }, data: { name: trimmedName } })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
}

// Only allowed for link documents — an uploaded file's url points at a file on
// disk, so changing it here would silently detach the record from the file.
export async function editDocumentUrl(documentId: string, hikeId: string, url: string) {
  await requireAdmin()

  const trimmedUrl = url.trim()
  if (!trimmedUrl) throw new Error('URL is required')

  const document = await prisma.hikeDocument.findUnique({ where: { id: documentId } })
  if (!document) throw new Error('Document not found')
  if (document.url.startsWith('/uploads/')) throw new Error('Cannot edit the link of an uploaded file')

  await prisma.hikeDocument.update({ where: { id: documentId }, data: { url: trimmedUrl } })

  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
}

export async function deleteDocument(documentId: string, hikeId: string) {
  await requireAdmin()

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
