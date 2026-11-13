import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UPLOAD_ROOT } from '@/lib/uploadStorage'

// File uploads. Participants upload their filled-in documents to one bucket (in a folder per event
// they're signed up for); every other bucket — cover photos, GPX tracks, document templates — is for
// admins. Each bucket takes only its kinds of file, checked by extension AND by the file's first bytes,
// so nothing that a browser would run (HTML, SVG, scripts) can be uploaded and served from this site.

type Kind = 'pdf' | 'jpg' | 'png' | 'webp' | 'gif' | 'docx' | 'doc' | 'xml'
const KIND_BY_EXT: Record<string, Kind> = {
  pdf: 'pdf', jpg: 'jpg', jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif', docx: 'docx', doc: 'doc', gpx: 'xml', kml: 'xml',
}
const IMAGES: Kind[] = ['jpg', 'png', 'webp', 'gif']
const BUCKETS: Record<string, { kinds: Kind[]; participants?: boolean }> = {
  'hike-covers': { kinds: IMAGES },
  'hike-photos': { kinds: IMAGES },
  'hike-gpx': { kinds: ['xml'] },
  'via-ferrata-documents': { kinds: ['pdf', 'docx', 'doc', 'jpg', 'png'] },
  'hike-document-submissions': { kinds: ['pdf', 'jpg', 'png', 'webp', 'docx'], participants: true },
}
const MAX_BYTES_PARTICIPANT = 10 * 1024 * 1024
const MAX_BYTES_ADMIN = 20 * 1024 * 1024

const startsWith = (buf: Buffer, bytes: number[], at = 0) => bytes.every((b, i) => buf[at + i] === b)

/** Whether the file's content is really of that kind (its "magic bytes"). */
function contentMatches(kind: Kind, buf: Buffer): boolean {
  switch (kind) {
    case 'pdf': return startsWith(buf, [0x25, 0x50, 0x44, 0x46]) // %PDF
    case 'jpg': return startsWith(buf, [0xff, 0xd8, 0xff])
    case 'png': return startsWith(buf, [0x89, 0x50, 0x4e, 0x47])
    case 'gif': return startsWith(buf, [0x47, 0x49, 0x46, 0x38])
    case 'webp': return startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)
    case 'docx': return startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) // a zip
    case 'doc': return startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0])
    case 'xml': {
      // GPX/KML tracks: XML, never anything a browser would run.
      const text = buf.subarray(0, 4096).toString('utf8').replace(/^﻿/, '').trimStart().toLowerCase()
      return text.startsWith('<') && /<(gpx|kml)[\s>]/.test(text) && !/<script|<html|xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/.test(buf.toString('utf8').toLowerCase())
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = session.user.role === 'admin'

  const formData = await req.formData()
  const bucketName = String(formData.get('bucket') ?? '')
  const bucket = BUCKETS[bucketName]
  if (!bucket) return NextResponse.json({ error: 'Unknown upload type' }, { status: 400 })
  if (!isAdmin && !bucket.participants) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  const maxBytes = isAdmin ? MAX_BYTES_ADMIN : MAX_BYTES_PARTICIPANT
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `The file is too big (at most ${maxBytes / 1024 / 1024} MB)` }, { status: 413 })
  }

  const ext = path.extname(file.name).slice(1).toLowerCase()
  const kind = KIND_BY_EXT[ext]
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!kind || !bucket.kinds.includes(kind) || !contentMatches(kind, buffer)) {
    return NextResponse.json({ error: 'This kind of file is not accepted here' }, { status: 415 })
  }

  // Participant documents go in a folder per event — only one the uploader is signed up for.
  let folder = bucketName
  if (bucket.participants) {
    const hikeId = String(formData.get('hikeId') ?? '').replace(/[^a-zA-Z0-9]/g, '')
    if (!hikeId) return NextResponse.json({ error: 'Missing event' }, { status: 400 })
    if (!isAdmin) {
      const participant = await prisma.hikeParticipant.findUnique({
        where: { hikeId_userId: { hikeId, userId: session.user.id } },
        select: { status: true },
      })
      if (!participant || participant.status === 'rejected') {
        return NextResponse.json({ error: 'Not registered for this event' }, { status: 403 })
      }
    }
    folder = path.join(bucketName, hikeId)
  }

  // A generated name: the original name only contributes a few safe characters, for recognisability.
  const base = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'file'
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${base}.${ext}`
  const dir = path.join(UPLOAD_ROOT, folder)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)

  return NextResponse.json({ url: `/uploads/${folder.split(path.sep).join('/')}/${filename}` })
}
