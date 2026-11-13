'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'
import { requireAdmin } from '@/lib/session'
import { removeUpload } from '@/lib/uploadStorage'

// A document is an uploaded file or a web link — never a javascript: or other scheme.
function assertDocumentUrl(url: string) {
  if (!/^(https?:\/\/|\/uploads\/)/i.test(url.trim())) throw new Error('Invalid document link')
}

export async function addDocument(hikeId: string, url: string, name: string, requiresUpload: boolean) {
  await requireAdmin()
  assertDocumentUrl(url)

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
  assertDocumentUrl(trimmedUrl)

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

  await removeUpload(document.url)

  await prisma.hikeDocument.delete({ where: { id: documentId } })
  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
}
