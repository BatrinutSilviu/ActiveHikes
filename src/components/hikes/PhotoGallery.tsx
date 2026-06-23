'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

type Photo = { id: string; url: string; caption: string | null }

export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  const prev = () => setLightbox(i => (i! > 0 ? i! - 1 : photos.length - 1))
  const next = () => setLightbox(i => (i! < photos.length - 1 ? i! + 1 : 0))

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <button key={photo.id} onClick={() => setLightbox(i)}
            className="aspect-square overflow-hidden rounded-lg hover:opacity-90 transition-opacity">
            <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-stone-300" onClick={() => setLightbox(null)}>
            <X size={28} />
          </button>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-stone-300 p-2"
            onClick={e => { e.stopPropagation(); prev() }}>
            <ChevronLeft size={36} />
          </button>
          <div onClick={e => e.stopPropagation()} className="max-w-4xl max-h-[85vh] flex flex-col items-center">
            <img src={photos[lightbox].url} alt={photos[lightbox].caption ?? ''}
              className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            {photos[lightbox].caption && <p className="text-white/70 text-sm mt-3">{photos[lightbox].caption}</p>}
            <p className="text-white/40 text-xs mt-1">{lightbox + 1} / {photos.length}</p>
          </div>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-stone-300 p-2"
            onClick={e => { e.stopPropagation(); next() }}>
            <ChevronRight size={36} />
          </button>
        </div>
      )}
    </>
  )
}
