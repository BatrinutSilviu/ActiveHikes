'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { uploadFile } from '@/lib/upload'
import { setCategoryCover } from '@/app/actions/categoryCovers'

type Dict = { upload: string; replace: string; remove: string; uploading: string; none: string; error: string; tooBig: string }

// The upload limit for admins (api/upload).
const MAX_BYTES = 20 * 1024 * 1024

export default function EventPhotosClient({ categories, covers, dict }: {
  categories: string[]
  covers: Record<string, string> // by the kind's name in lower case
  dict: Dict
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {categories.map(c => <CategoryCard key={c} category={c} initial={covers[c.trim().toLowerCase()] ?? null} dict={dict} />)}
    </div>
  )
}

function CategoryCard({ category, initial, dict }: { category: string; initial: string | null; dict: Dict }) {
  const router = useRouter()
  const [url, setUrl] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async (next: string | null) => {
    await setCategoryCover(category, next)
    setUrl(next)
    router.refresh()
  }
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await fn() } catch (e) { setError(`${dict.error}${e instanceof Error && e.message ? ` (${e.message})` : ''}`) }
    finally { setBusy(false) }
  }
  const onFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_BYTES) { setError(dict.tooBig.replace('{size}', (file.size / 1024 / 1024).toFixed(1))); return }
    run(async () => save(await uploadFile(file, 'hike-covers')))
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] sm:aspect-[16/9] bg-stone-100">
        {url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt={category} className="absolute inset-0 h-full w-full object-cover" />
          : <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-stone-400">
              <ImagePlus size={26} strokeWidth={1.6} />
              <span className="text-xs hidden sm:block">{dict.none}</span>
            </div>}
        {busy && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center gap-2 text-sm text-stone-600">
            <Loader2 size={16} className="animate-spin" /> {dict.uploading}
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="font-semibold text-stone-800 truncate">{category}</span>
        <div className="flex items-center gap-1.5 sm:shrink-0">
          <label className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg px-3 py-2 sm:py-1.5 text-xs font-semibold transition-colors ${
            busy ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
              : url ? 'border border-stone-200 text-stone-700 hover:bg-stone-50 cursor-pointer'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
          }`}>
            {url ? <RefreshCw size={13} /> : <ImagePlus size={13} />}
            {url ? dict.replace : dict.upload}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={busy}
              onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {url && (
            <button type="button" disabled={busy} onClick={() => run(() => save(null))} title={dict.remove} aria-label={dict.remove}
              className="rounded-lg p-2 sm:p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      {error && <p className="px-4 pb-3 -mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
