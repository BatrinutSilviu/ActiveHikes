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

// A participant uploads one completed document for the event — not tied to a
// specific template, so any number of files (covering any number of
// templates, now or added later) all land in one list for that hike.
export async function submitDocument(hikeId: string, url: string, fileName: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const participant = await prisma.hikeParticipant.findUnique({
    where: { hikeId_userId: { hikeId, userId: session.user.id } },
  })
  if (!participant) throw new Error('Not registered for this event')

  await prisma.hikeDocumentSubmission.create({
    data: { hikeId, participantId: participant.id, url, fileName },
  })

  revalidateHikePaths(hikeId)
}

// Lets an admin try out the upload flow as a dry run — stored separately from
// real participant submissions (keyed by admin user, not a HikeParticipant
// row) so it never touches real participant data.
export async function submitPreviewDocument(hikeId: string, url: string, fileName: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  await prisma.hikeDocumentSubmission.create({
    data: { hikeId, previewAdminId: session.user.id, url, fileName },
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

  const isOwner = submission.participant?.userId === session.user.id || submission.previewAdminId === session.user.id
  const isAdmin = session.user.role === 'admin'
  if (!isOwner && !isAdmin) throw new Error('Unauthorized')

  await unlinkUpload(submission.url)
  await prisma.hikeDocumentSubmission.delete({ where: { id: submissionId } })

  revalidateHikePaths(hikeId)
}
