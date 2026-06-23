'use client'

import { useState, useTransition } from 'react'
import { addPhoto, deletePhoto } from '@/app/actions/photos'
import { Upload, Trash2, X } from 'lucide-react'

const MAX_PHOTOS = 2

type Photo = { id: string; url: string; caption: string | null }

export default function PhotoUploader({ hikeId, existingPhotos }: {
  hikeId: string
  existingPhotos: Photo[]
}) {
  const [photos, setPhotos] = useState<Photo[]>(existingPhotos)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()

  const canUpload = photos.length < MAX_PHOTOS

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('bucket', 'hike-photos')

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const { url } = await res.json()

    startTransition(async () => {
      await addPhoto(hikeId, url, caption)
      setPhotos(prev => [...prev, { id: Date.now().toString(), url, caption: caption || null }])
      setSelectedFile(null)
      setCaption('')
      setUploading(false)
    })
  }

  const handleDelete = (photo: Photo) => {
    if (!confirm('Delete this photo?')) return
    startTransition(async () => {
      await deletePhoto(photo.id, hikeId)
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
    })
  }

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-4">
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative group aspect-video rounded-lg overflow-hidden">
              <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => handleDelete(photo)} className="text-white hover:text-red-400">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {canUpload ? (
        <div className="space-y-3">
          <p className="text-xs text-stone-400">{photos.length}/{MAX_PHOTOS} photos uploaded</p>
          {selectedFile ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <span className="text-emerald-700 font-medium text-sm flex-1 truncate">{selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} className="text-stone-400 hover:text-red-500"><X size={16} /></button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 border-2 border-dashed border-stone-200 rounded-xl p-5 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
              <Upload size={20} className="text-stone-400" />
              <span className="text-stone-500 text-sm">Click to select photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])} />
            </label>
          )}
          {selectedFile && (
            <>
              <input type="text" value={caption} onChange={e => setCaption(e.target.value)}
                placeholder="Caption (optional)"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={handleUpload} disabled={uploading}
                className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                {uploading ? 'Uploading…' : 'Upload photo'}
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-stone-400 text-center">{MAX_PHOTOS}/{MAX_PHOTOS} photos — delete one to upload another</p>
      )}
    </div>
  )
}
