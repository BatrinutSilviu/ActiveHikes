'use client'

import { useState, useTransition } from 'react'
import { addDocument, deleteDocument, renameDocument } from '@/app/actions/documents'
import { Upload, Trash2, X, FileText, Link as LinkIcon, Pencil, Check, User } from 'lucide-react'

type DocumentSubmission = { id: string; url: string; participantName: string }
type ViaFerrataDoc = { id: string; url: string; name: string; submissions?: DocumentSubmission[] }

type Dict = {
  title: string
  hint: string
  namePlaceholder: string
  selectFile: string
  upload: string
  uploading: string
  uploadFileTab: string
  addLinkTab: string
  linkPlaceholder: string
  addLink: string
  adding: string
  deleteConfirm: string
  noDocuments: string
  submissionsLabel: string
}

export default function ViaFerrataDocumentUploader({ viaFerrataId, existingDocuments, dict }: {
  viaFerrataId: string
  existingDocuments: ViaFerrataDoc[]
  dict: Dict
}) {
  const [documents, setDocuments] = useState<ViaFerrataDoc[]>(existingDocuments)
  const [mode, setMode] = useState<'file' | 'link'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [, startTransition] = useTransition()

  const startEdit = (document: ViaFerrataDoc) => {
    setEditingId(document.id)
    setEditingName(document.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveEdit = () => {
    if (!editingId) return
    const trimmedName = editingName.trim()
    if (!trimmedName) return
    const id = editingId
    startTransition(async () => {
      await renameDocument(id, viaFerrataId, trimmedName)
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, name: trimmedName } : d))
      setEditingId(null)
      setEditingName('')
    })
  }

  const switchMode = (next: 'file' | 'link') => {
    setMode(next)
    setSelectedFile(null)
    setLinkUrl('')
    setName('')
  }

  const addDocumentEntry = (url: string, docName: string) => {
    startTransition(async () => {
      await addDocument(viaFerrataId, url, docName)
      setDocuments(prev => [...prev, { id: Date.now().toString(), url, name: docName }])
      setSelectedFile(null)
      setLinkUrl('')
      setName('')
      setUploading(false)
    })
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('bucket', 'via-ferrata-documents')

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const { url } = await res.json()
    const docName = name.trim() || selectedFile.name

    addDocumentEntry(url, docName)
  }

  const handleAddLink = () => {
    const trimmedUrl = linkUrl.trim()
    const trimmedName = name.trim()
    if (!trimmedUrl || !trimmedName) return
    setUploading(true)
    addDocumentEntry(trimmedUrl, trimmedName)
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
            <div key={document.id} className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5 space-y-2">
              <div className="flex items-center gap-3">
                {document.url.startsWith('/uploads/') ? (
                  <FileText size={16} className="text-stone-400 shrink-0" />
                ) : (
                  <LinkIcon size={16} className="text-stone-400 shrink-0" />
                )}
                {editingId === document.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                      autoFocus
                      className="flex-1 border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button onClick={saveEdit} disabled={!editingName.trim()} className="text-emerald-600 hover:text-emerald-700 shrink-0 disabled:opacity-50">
                      <Check size={16} />
                    </button>
                    <button onClick={cancelEdit} className="text-stone-400 hover:text-red-500 shrink-0">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <a href={document.url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 truncate text-sm text-stone-700 hover:text-emerald-600 hover:underline">
                      {document.name}
                    </a>
                    <button onClick={() => startEdit(document)} className="text-stone-400 hover:text-emerald-600 shrink-0">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(document)} className="text-stone-400 hover:text-red-500 shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
              {!!document.submissions?.length && (
                <div className="pl-7 space-y-1">
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">
                    {dict.submissionsLabel} ({document.submissions.length})
                  </p>
                  {document.submissions.map(submission => (
                    <a key={submission.id} href={submission.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-emerald-700 hover:underline">
                      <User size={11} className="shrink-0" /> {submission.participantName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl" role="group">
          <button type="button" onClick={() => switchMode('file')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === 'file' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}>
            <Upload size={14} className="shrink-0" /> {dict.uploadFileTab}
          </button>
          <button type="button" onClick={() => switchMode('link')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === 'link' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}>
            <LinkIcon size={14} className="shrink-0" /> {dict.addLinkTab}
          </button>
        </div>

        {mode === 'file' ? (
          selectedFile ? (
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
          )
        ) : (
          <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
            placeholder={dict.linkPlaceholder}
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        )}

        {(mode === 'file' ? !!selectedFile : !!linkUrl.trim()) && (
          <>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={dict.namePlaceholder}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <button onClick={mode === 'file' ? handleUpload : handleAddLink}
              disabled={uploading || (mode === 'link' && !name.trim())}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
              {uploading ? (mode === 'file' ? dict.uploading : dict.adding) : (mode === 'file' ? dict.upload : dict.addLink)}
            </button>
          </>
        )}
      </div>

      {documents.length === 0 && !selectedFile && !linkUrl && (
        <p className="text-xs text-stone-400 text-center">{dict.noDocuments}</p>
      )}
    </div>
  )
}
