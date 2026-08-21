'use client'

import { useState, useTransition } from 'react'
import { addDocument, deleteDocument } from '@/app/actions/documents'
import { Upload, Trash2, X, FileText } from 'lucide-react'

type ViaFerrataDoc = { id: string; url: string; name: string }

type Dict = {
  title: string
  hint: string
  namePlaceholder: string
  selectFile: string
  upload: string
  uploading: string
  deleteConfirm: string
  noDocuments: string
}

export default function ViaFerrataDocumentUploader({ viaFerrataId, existingDocuments, dict }: {
  viaFerrataId: string
  existingDocuments: ViaFerrataDoc[]
  dict: Dict
}) {
  const [documents, setDocuments] = useState<ViaFerrataDoc[]>(existingDocuments)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('bucket', 'via-ferrata-documents')

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const { url } = await res.json()
    const docName = name.trim() || selectedFile.name

    startTransition(async () => {
      await addDocument(viaFerrataId, url, docName)
      setDocuments(prev => [...prev, { id: Date.now().toString(), url, name: docName }])
      setSelectedFile(null)
      setName('')
      setUploading(false)
    })
  }

  const handleDelete = (document: ViaFerrataDoc) => {
    if (!confirm(dict.deleteConfirm)) return
    startTransition(async () => {
      await deleteDocument(document.id, viaFerrataId)
      setDocuments(prev => prev.filter(d => d.id !== document.id))
    })
  }

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-4">
      <h2 className="text-xl font-bold text-stone-800">{dict.title}</h2>
      <p className="text-xs text-stone-400">{dict.hint}</p>

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(document => (
            <div key={document.id} className="flex items-center gap-3 bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5">
              <FileText size={16} className="text-stone-400 shrink-0" />
              <a href={document.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 truncate text-sm text-stone-700 hover:text-emerald-600 hover:underline">
                {document.name}
              </a>
              <button onClick={() => handleDelete(document)} className="text-stone-400 hover:text-red-500 shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {selectedFile ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <span className="text-emerald-700 font-medium text-sm flex-1 truncate">{selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} className="text-stone-400 hover:text-red-500"><X size={16} /></button>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-2 border-2 border-dashed border-stone-200 rounded-xl p-5 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
            <Upload size={20} className="text-stone-400" />
            <span className="text-stone-500 text-sm">{dict.selectFile}</span>
            <input type="file" className="hidden" onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])} />
          </label>
        )}
        {selectedFile && (
          <>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={dict.namePlaceholder}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <button onClick={handleUpload} disabled={uploading}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
              {uploading ? dict.uploading : dict.upload}
            </button>
          </>
        )}
      </div>

      {documents.length === 0 && !selectedFile && (
        <p className="text-xs text-stone-400 text-center">{dict.noDocuments}</p>
      )}
    </div>
  )
}
