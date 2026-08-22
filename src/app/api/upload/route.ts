import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Participants upload their filled-in documents to this bucket — every other
// bucket (cover photos, GPX tracks, admin document templates, …) stays admin-only.
const PARTICIPANT_UPLOAD_BUCKET = 'hike-document-submissions'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const formData = await req.formData()
  const bucket = (formData.get('bucket') as string) || 'misc'

  const isAdmin = session?.user?.role === 'admin'
  const isParticipantUpload = !!session && bucket === PARTICIPANT_UPLOAD_BUCKET
  if (!isAdmin && !isParticipantUpload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filename = `${Date.now()}-${safeName}`

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', bucket)
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  return NextResponse.json({ url: `/uploads/${bucket}/${filename}` })
}
