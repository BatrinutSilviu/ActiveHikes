'use client'

import { useState, useTransition } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { submitDocument, submitPreviewDocument, deleteSubmission } from '@/app/actions/documentSubmissions'
import { isNetworkError, withTimeout } from '@/lib/net'
import { uploadFile } from '@/lib/upload'
import { useDict } from '@/hooks/useDict'

type Submission = { id: string; url: string; fileName: string }

type Dict = {
  title: string
  hint: string
  uploadButton: string
  uploading: string
  deleteConfirm: string
  countLabel: string
  limitReached: string
}

export default function DocumentUploadsSection({ hikeId, previewMode, submissions, maxUploads, dict }: {
  hikeId: string
  previewMode: boolean
  submissions: Submission[]
  maxUploads: number
  dict: Dict
}) {
  const [items, setItems] = useState(submissions)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const net = useDict().network
  const atLimit = items.length >= maxUploads

  const failMessage = (err: unknown) => (isNetworkError(err) ? net.error : net.failed)

  const handleFile = async (file: File) => {
    if (uploading) return
    setUploading(true)
    setError('')
    let url: string
    try {
      url = await uploadFile(file, 'hike-document-submissions', { hikeId })
    } catch (err) {
      setError(failMessage(err))
      setUploading(false)
      return
    }
    startTransition(async () => {
      try {
        if (previewMode) {
          await withTimeout(submitPreviewDocument(hikeId, url, file.name))
        } else {
          await withTimeout(submitDocument(hikeId, url, file.name))
        }
        setItems(prev => [...prev, { id: `${Date.now()}`, url, fileName: file.name }])
      } catch (err) {
        setError(failMessage(err))
      } finally {
        setUploading(false)
      }
    })
  }

  const handleDelete = (item: Submission) => {
    if (isPending || !confirm(dict.deleteConfirm)) return
    setError('')
    startTransition(async () => {
      try {
        await withTimeout(deleteSubmission(item.id, hikeId))
        setItems(prev => prev.filter(i => i.id !== item.id))
      } catch (err) {
        setError(failMessage(err))
      }
    })
  }

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-stone-800">{dict.title}</h3>
        <span className="text-xs text-stone-400 shrink-0">{dict.countLabel.replace('{count}', String(items.length)).replace('{max}', String(maxUploads))}</span>
      </div>
      <p className="text-stone-500 text-sm">{dict.hint}</p>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id} className="flex items-center gap-2.5 bg-stone-50 border border-stone-100 rounded-xl px-3.5 py-2.5">
              <FileText size={14} className="text-emerald-500 shrink-0" />
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 truncate text-sm text-stone-700 hover:text-emerald-600 hover:underline">
                {item.fileName}
              </a>
              <button onClick={() => handleDelete(item)} disabled={isPending} className="text-stone-400 hover:text-red-500 disabled:opacity-50 shrink-0">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {atLimit ? (
        <p className="text-center text-xs text-stone-400 py-2">{dict.limitReached}</p>
      ) : (
        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-stone-200 rounded-xl py-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-sm font-semibold text-emerald-700">
          <Upload size={16} />
          {uploading ? dict.uploading : dict.uploadButton}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx" className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleFile(f) }} />
        </label>
      )}
      {error && <p role="alert" className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
    </div>
  )
}
