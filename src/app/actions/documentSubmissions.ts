'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'
import { requireAdmin } from '@/lib/session'
import { isSubmissionUrl, removeUpload } from '@/lib/uploadStorage'

// A document's display name, as the uploader called it (shown in lists, never used as a path).
const cleanName = (name: string) => name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 150) || 'document'

function assertSubmissionUrl(url: string, hikeId: string) {
  if (!isSubmissionUrl(url, hikeId)) throw new Error('Invalid document')
}


function revalidateHikePaths(hikeId: string) {
  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
}

async function getRequiredDocumentCount(hikeId: string) {
  return prisma.hikeDocument.count({ where: { hikeId, requiresUpload: true } })
}

// A participant uploads one completed document for the event — not tied to a
// specific template, so any number of files (covering any number of
// templates, now or added later) all land in one list for that hike, capped
// at how many documents actually require a filled copy back.
export async function submitDocument(hikeId: string, url: string, fileName: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const participant = await prisma.hikeParticipant.findUnique({
    where: { hikeId_userId: { hikeId, userId: session.user.id } },
  })
  if (!participant || participant.status === 'rejected') throw new Error('Not registered for this event')
  assertSubmissionUrl(url, hikeId)

  const [existingCount, requiredCount] = await Promise.all([
    prisma.hikeDocumentSubmission.count({ where: { participantId: participant.id } }),
    getRequiredDocumentCount(hikeId),
  ])
  if (existingCount >= requiredCount) throw new Error('Upload limit reached')

  await prisma.hikeDocumentSubmission.create({
    data: { hikeId, participantId: participant.id, url, fileName: cleanName(fileName) },
  })

  revalidateHikePaths(hikeId)
}

// Lets an admin upload a completed document on behalf of a participant who
// handed it in some other way (in person, by email, etc.) instead of using
// the self-serve upload.
export async function submitDocumentForParticipant(hikeId: string, participantId: string, url: string, fileName: string) {
  await requireAdmin()

  const participant = await prisma.hikeParticipant.findUnique({ where: { id: participantId } })
  if (!participant || participant.hikeId !== hikeId) throw new Error('Participant not found')
  assertSubmissionUrl(url, hikeId)

  const [existingCount, requiredCount] = await Promise.all([
    prisma.hikeDocumentSubmission.count({ where: { participantId } }),
    getRequiredDocumentCount(hikeId),
  ])
  if (existingCount >= requiredCount) throw new Error('Upload limit reached')

  await prisma.hikeDocumentSubmission.create({
    data: { hikeId, participantId, url, fileName: cleanName(fileName) },
  })

  revalidateHikePaths(hikeId)
}

// Lets an admin try out the upload flow as a dry run — stored separately from
// real participant submissions (keyed by admin user, not a HikeParticipant
// row) so it never touches real participant data.
export async function submitPreviewDocument(hikeId: string, url: string, fileName: string) {
  const session = await requireAdmin()
  assertSubmissionUrl(url, hikeId)

  const [existingCount, requiredCount] = await Promise.all([
    prisma.hikeDocumentSubmission.count({ where: { hikeId, previewAdminId: session.user.id } }),
    getRequiredDocumentCount(hikeId),
  ])
  if (existingCount >= requiredCount) throw new Error('Upload limit reached')

  await prisma.hikeDocumentSubmission.create({
    data: { hikeId, previewAdminId: session.user.id, url, fileName: cleanName(fileName) },
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
  if (!submission || submission.hikeId !== hikeId) return

  const isOwner = submission.participant?.userId === session.user.id || submission.previewAdminId === session.user.id
  const isAdmin = session.user.role === 'admin'
  if (!isOwner && !isAdmin) throw new Error('Unauthorized')

  await removeUpload(submission.url)
  await prisma.hikeDocumentSubmission.delete({ where: { id: submissionId } })

  revalidateHikePaths(hikeId)
}
