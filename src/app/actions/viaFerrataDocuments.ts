'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import path from 'path'
import { revalidateLocalePaths } from '@/lib/i18n'

export async function addViaFerrataDocument(viaFerrataId: string, url: string, name: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  await prisma.viaFerrataDocument.create({
    data: { viaFerrataId, url, name },
  })

  revalidateLocalePaths(`/admin/via-ferrata/${viaFerrataId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${viaFerrataId}`, revalidatePath)
}

export async function deleteViaFerrataDocument(documentId: string, viaFerrataId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const document = await prisma.viaFerrataDocument.findUnique({ where: { id: documentId } })
  if (!document) return

  try {
    const relativePath = document.url.startsWith('/') ? document.url.slice(1) : document.url
    await unlink(path.join(process.cwd(), 'public', relativePath))
  } catch {
    // File may not exist — continue
  }

  await prisma.viaFerrataDocument.delete({ where: { id: documentId } })
  revalidateLocalePaths(`/admin/via-ferrata/${viaFerrataId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${viaFerrataId}`, revalidatePath)
}
