'use client'

import { useState, useTransition } from 'react'
import { FileText, User, Upload, X } from 'lucide-react'
import { submitDocumentForParticipant, deleteSubmission } from '@/app/actions/documentSubmissions'

type Upload = { id: string; url: string; fileName: string; participantName: string; isPreview: boolean }
type Participant = { id: string; name: string }

type Dict = {
  title: string
  hint: string
  empty: string
  previewLabel: string
  participantPlaceholder: string
  noParticipants: string
  uploadButton: string
  uploading: string
  deleteConfirm: string
}

export default function ParticipantDocumentUploads({ hikeId, uploads, participants, dict }: {
  hikeId: string
  uploads: Upload[]
  participants: Participant[]
  dict: Dict
}) {
  const [items, setItems] = useState(uploads)
  const [participantId, setParticipantId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()

  const handleFile = async (file: File) => {
    const participant = participants.find(p => p.id === participantId)
    if (!participant) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'hike-document-submissions')
    formData.append('hikeId', hikeId)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const { url } = await res.json()
    startTransition(async () => {
      await submitDocumentForParticipant(hikeId, participant.id, url, file.name)
      setItems(prev => [...prev, { id: `${Date.now()}`, url, fileName: file.name, participantName: participant.name, isPreview: false }])
      setUploading(false)
    })
  }

  const handleDelete = (item: Upload) => {
    if (!confirm(dict.deleteConfirm)) return
    startTransition(async () => {
      await deleteSubmission(item.id, hikeId)
      setItems(prev => prev.filter(i => i.id !== item.id))
    })
  }

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-3">
      <h2 className="text-xl font-bold text-stone-800">{dict.title}</h2>
      <p className="text-xs text-stone-400">{dict.hint}</p>
      {items.length === 0 ? (
        <p className="text-xs text-stone-400 text-center py-2">{dict.empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map(upload => (
            <div key={upload.id} className="flex items-center gap-3 bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5">
              <a href={upload.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 flex-1 min-w-0 hover:text-emerald-600">
                <FileText size={16} className="text-emerald-500 shrink-0" />
                <span className="flex-1 truncate text-sm text-stone-700">{upload.fileName}</span>
              </a>
              <span className="flex items-center gap-1 text-xs text-stone-400 shrink-0">
                <User size={11} /> {upload.isPreview ? dict.previewLabel : upload.participantName}
              </span>
              <button onClick={() => handleDelete(upload)} className="text-stone-400 hover:text-red-500 shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {participants.length === 0 ? (
        <p className="text-xs text-stone-400 text-center py-2">{dict.noParticipants}</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={participantId} onChange={e => setParticipantId(e.target.value)}
            className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">{dict.participantPlaceholder}</option>
            {participants.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <label className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shrink-0 transition-colors ${
            !participantId || uploading ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
          }`}>
            <Upload size={16} />
            {uploading ? dict.uploading : dict.uploadButton}
            <input type="file" className="hidden" disabled={!participantId || uploading}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        </div>
      )}
    </div>
  )
}
