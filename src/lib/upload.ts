import { apiFetch } from '@/lib/net'

/**
 * Uploads a file through /api/upload and returns its public URL. Fails loudly instead of
 * silently continuing with an undefined URL when the server rejects it.
 * `extra` adds form fields, e.g. `{ hikeId }` so participant documents land in the event's folder.
 */
export async function uploadFile(file: File, bucket: string, extra: Record<string, string> = {}): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('bucket', bucket)
  for (const [key, value] of Object.entries(extra)) fd.append(key, value)
  // Phone photos can be large on a slow connection — allow a couple of minutes.
  const res = await apiFetch('/api/upload', { method: 'POST', body: fd, timeoutMs: 120_000 })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.url) throw new Error(data?.error ?? `Upload failed (${res.status})`)
  return data.url
}
