'use client'

import { useState, useTransition } from 'react'
import { FileText, Download, ExternalLink, Upload, Check } from 'lucide-react'
import { submitDocument, submitPreviewDocument } from '@/app/actions/documentSubmissions'

type ViaFerrataDoc = { id: string; url: string; name: string }
type Submission = { id: string; url: string }

type UploadDict = {
  upload: string
  uploading: string
  submitted: string
  replace: string
}

export default function DocumentsSection({ documents, title, hint, hikeId, canSubmit, previewMode, submissions, uploadDict }: {
  documents: ViaFerrataDoc[]
  title: string
  hint: string
  hikeId?: string
  canSubmit?: boolean
  previewMode?: boolean
  submissions?: Record<string, Submission>
  uploadDict?: UploadDict
}) {
  if (documents.length === 0) return null

  const showUpload = !!hikeId && !!canSubmit && !!uploadDict

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-stone-800 flex items-center gap-2">
        <FileText size={18} /> {title}
      </h3>
      <p className="text-stone-500 text-sm">{hint}</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {documents.map(document => (
          <DocumentRow
            key={document.id}
            document={document}
            hikeId={hikeId}
            previewMode={!!previewMode}
            submission={submissions?.[document.id]}
            uploadDict={uploadDict}
            canSubmit={showUpload}
          />
        ))}
      </ul>
    </div>
  )
}

function DocumentRow({ document, hikeId, previewMode, submission, uploadDict, canSubmit }: {
  document: ViaFerrataDoc
  hikeId?: string
  previewMode: boolean
  submission?: Submission
  uploadDict?: UploadDict
  canSubmit: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()
  const isFile = document.url.startsWith('/uploads/')

  const handleFile = async (file: File) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'hike-document-submissions')
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const { url } = await res.json()
    startTransition(async () => {
      if (previewMode) {
        await submitPreviewDocument(document.id, hikeId!, url)
      } else {
        await submitDocument(document.id, hikeId!, url)
      }
      setUploading(false)
    })
  }

  return (
    <li className="bg-stone-50 border border-stone-100 rounded-xl px-3.5 py-2.5 space-y-2">
      <a href={document.url} target="_blank" rel="noopener noreferrer" download={isFile}
        className="flex items-center gap-2.5 text-sm text-stone-700 hover:text-emerald-600 hover:underline">
        <FileText size={14} className="text-emerald-500 shrink-0" />
        <span className="flex-1 truncate">{document.name}</span>
        {isFile ? <Download size={14} className="text-stone-400 shrink-0" /> : <ExternalLink size={14} className="text-stone-400 shrink-0" />}
      </a>
      {canSubmit && uploadDict && isFile && (
        <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
          {submission && (
            <a href={submission.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline">
              <Check size={12} /> {uploadDict.submitted}
            </a>
          )}
          <label className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer ${submission ? 'ml-auto text-stone-500 hover:text-emerald-600' : 'text-emerald-700 hover:text-emerald-800'}`}>
            <Upload size={12} className={submission ? 'hidden' : undefined} />
            {uploading ? uploadDict.uploading : submission ? uploadDict.replace : uploadDict.upload}
            <input type="file" className="hidden" disabled={uploading} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
        </div>
      )}
    </li>
  )
}
