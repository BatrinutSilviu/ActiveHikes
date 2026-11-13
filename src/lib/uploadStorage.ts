import 'server-only'
import path from 'path'
import { unlink } from 'fs/promises'

// Uploaded files live in public/uploads/<bucket>/… and are referenced by their URL (/uploads/…).
// Every path built from a stored URL goes through here, so nothing outside that folder can be
// touched — whatever a URL in the database (or a client) says.

export const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads')
const UPLOAD_URL = /^\/uploads\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)?\/[A-Za-z0-9._-]+$/

/** The file on disk for an /uploads/… URL, or null when the URL isn't one of ours. */
export function uploadPath(url: string): string | null {
  if (!UPLOAD_URL.test(url) || url.includes('..')) return null
  const resolved = path.resolve(UPLOAD_ROOT, url.slice('/uploads/'.length))
  return resolved.startsWith(UPLOAD_ROOT + path.sep) ? resolved : null
}

/** Deletes an uploaded file; anything that isn't an upload (an external link, a bad path) is left alone. */
export async function removeUpload(url: string) {
  const file = uploadPath(url)
  if (!file) return
  await unlink(file).catch(() => { /* already gone */ })
}

/** Whether a URL is a participant document uploaded for this event (see the upload route). */
export function isSubmissionUrl(url: string, hikeId: string): boolean {
  const prefix = `/uploads/hike-document-submissions/${hikeId.replace(/[^a-zA-Z0-9]/g, '')}/`
  return url.startsWith(prefix) && uploadPath(url) !== null
}
