'use client'

import { useState, useTransition } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { submitDocument, submitPreviewDocument, deleteSubmission } from '@/app/actions/documentSubmissions'

type Submission = { id: string; url: string; fileName: string }

type Dict = {
  title: string
  hint: string
  uploadButton: string
  uploading: string
  deleteConfirm: string
}

export default function DocumentUploadsSection({ hikeId, previewMode, submissions, dict }: {
  hikeId: string
  previewMode: boolean
  submissions: Submission[]
  dict: Dict
}) {
  const [items, setItems] = useState(submissions)
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()

  const handleFile = async (file: File) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'hike-document-submissions')
    formData.append('hikeId', hikeId)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const { url } = await res.json()
    startTransition(async () => {
      if (previewMode) {
        await submitPreviewDocument(hikeId, url, file.name)
      } else {
        await submitDocument(hikeId, url, file.name)
      }
      setItems(prev => [...prev, { id: `${Date.now()}`, url, fileName: file.name }])
      setUploading(false)
    })
  }

  const handleDelete = (item: Submission) => {
    if (!confirm(dict.deleteConfirm)) return
    startTransition(async () => {
      await deleteSubmission(item.id, hikeId)
      setItems(prev => prev.filter(i => i.id !== item.id))
    })
  }

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-stone-800">{dict.title}</h3>
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
              <button onClick={() => handleDelete(item)} className="text-stone-400 hover:text-red-500 shrink-0">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="flex items-center justify-center gap-2 border-2 border-dashed border-stone-200 rounded-xl py-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-sm font-semibold text-emerald-700">
        <Upload size={16} />
        {uploading ? dict.uploading : dict.uploadButton}
        <input type="file" className="hidden" disabled={uploading} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </label>
    </div>
  )
}
