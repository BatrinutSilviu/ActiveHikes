import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.gpx': 'application/gpx+xml',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params

  if (segments.some((s) => s.includes('..') || s.includes('/') || s.includes('\\'))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', ...segments)

  try {
    const data = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    return new NextResponse(data, {
      headers: {
        'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
