'use client'

import { useEffect, useRef, useState } from 'react'

// Keeps an unsaved copy of a form in localStorage so a failed save, a crash or
// an accidental reload never loses what the admin typed. The draft is restored
// on the next visit and cleared once a save succeeds.
export function useFormDraft<T>(key: string, value: T, restore: (draft: T) => void) {
  const storageKey = `form-draft:${key}`
  const initial = useRef(JSON.stringify(value))
  const loaded = useRef(false)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved && saved !== initial.current) {
        restore(JSON.parse(saved) as T)
        setRestored(true)
      }
    } catch {}
    loaded.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    if (!loaded.current) return
    try {
      const json = JSON.stringify(value)
      if (json === initial.current) localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, json)
    } catch {}
  }, [storageKey, value])

  // Call after a successful save: the saved values become the new baseline.
  const clearDraft = (savedValue: T) => {
    initial.current = JSON.stringify(savedValue)
    setRestored(false)
    try { localStorage.removeItem(storageKey) } catch {}
  }

  // Throw away the restored draft and go back to what is saved on the server.
  const discardDraft = () => {
    try { localStorage.removeItem(storageKey) } catch {}
    restore(JSON.parse(initial.current) as T)
    setRestored(false)
  }

  return { restored, clearDraft, discardDraft }
}

// Uploads a file through /api/upload and fails loudly instead of silently
// continuing with an undefined URL when the server rejects it.
export async function uploadFile(file: File, bucket: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('bucket', bucket)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.url) throw new Error(data?.error ?? `Upload failed (${res.status})`)
  return data.url
}
