'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import path from 'path'
import { revalidateLocalePaths } from '@/lib/i18n'

async function unlinkUpload(url: string) {
  try {
    const relativePath = url.startsWith('/') ? url.slice(1) : url
    await unlink(path.join(process.cwd(), 'public', relativePath))
  } catch {
    // File may not exist — continue
  }
}

function revalidateHikePaths(hikeId: string) {
  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
}

export async function submitDocument(documentId: string, hikeId: string, url: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const document = await prisma.hikeDocument.findUnique({ where: { id: documentId } })
  if (!document || document.hikeId !== hikeId) throw new Error('Document not found')

  const participant = await prisma.hikeParticipant.findUnique({
    where: { hikeId_userId: { hikeId, userId: session.user.id } },
  })
  if (!participant) throw new Error('Not registered for this event')

  const existing = await prisma.hikeDocumentSubmission.findUnique({
    where: { documentId_participantId: { documentId, participantId: participant.id } },
  })
  if (existing) await unlinkUpload(existing.url)

  await prisma.hikeDocumentSubmission.upsert({
    where: { documentId_participantId: { documentId, participantId: participant.id } },
    create: { documentId, participantId: participant.id, url },
    update: { url, submittedAt: new Date() },
  })

  revalidateHikePaths(hikeId)
}

export async function deleteSubmission(submissionId: string, hikeId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const submission = await prisma.hikeDocumentSubmission.findUnique({
    where: { id: submissionId },
    include: { participant: true },
  })
  if (!submission) return

  const isOwner = submission.participant.userId === session.user.id
  const isAdmin = session.user.role === 'admin'
  if (!isOwner && !isAdmin) throw new Error('Unauthorized')

  await unlinkUpload(submission.url)
  await prisma.hikeDocumentSubmission.delete({ where: { id: submissionId } })

  revalidateHikePaths(hikeId)
}
