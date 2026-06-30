'use client'

import { useEffect, useRef, useState } from 'react'
import { X, MapPin, Check } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const AREA_RADIUS_M = 1000 // 1 km approximate pickup area

export default function LocationPickerModal({
  initialLat,
  initialLng,
  title,
  hint,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: {
  initialLat: number | null
  initialLng: number | null
  title: string
  hint: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: (lat: number, lng: number) => void
  onClose: () => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [pendingLat, setPendingLat] = useState<number | null>(initialLat)
  const [pendingLng, setPendingLng] = useState<number | null>(initialLng)

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    let map: import('leaflet').Map | null = null

    const init = async () => {
      const L = (await import('leaflet')).default

      const container = mapRef.current!
      if ((container as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

      const center: [number, number] = initialLat != null && initialLng != null
        ? [initialLat, initialLng]
        : [45.7489, 21.2087]

      map = L.map(container, { zoomControl: true, scrollWheelZoom: true })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      map.setView(center, initialLat != null ? 14 : 12)
      setTimeout(() => map?.invalidateSize(), 50)

      let area: import('leaflet').Circle | null = null
      let dot: import('leaflet').CircleMarker | null = null

      const placeArea = (lat: number, lng: number) => {
        if (area) {
          area.setLatLng([lat, lng])
          dot!.setLatLng([lat, lng])
        } else {
          area = L.circle([lat, lng], {
            radius: AREA_RADIUS_M,
            color: '#059669',
            weight: 2,
            opacity: 0.7,
            fillColor: '#059669',
            fillOpacity: 0.12,
            interactive: false,
          }).addTo(map!)
          dot = L.circleMarker([lat, lng], {
            radius: 5,
            color: '#059669',
            weight: 2,
            fillColor: '#059669',
            fillOpacity: 1,
            interactive: false,
          }).addTo(map!)
        }
        setPendingLat(lat)
        setPendingLng(lng)
      }

      if (initialLat != null && initialLng != null) placeArea(initialLat, initialLng)

      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        placeArea(e.latlng.lat, e.latlng.lng)
      })
    }

    init()
    return () => { map?.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:w-[min(92vw,680px)] bg-white rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
        style={{ height: 'min(92vh, 640px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={18} className="text-emerald-600 shrink-0" />
            <h3 className="font-bold text-stone-900 truncate">{title}</h3>
          </div>
          {/* 44×44 tap target */}
          <button
            onClick={onClose}
            className="-mr-1.5 p-3 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hint */}
        <p className="px-4 sm:px-5 py-2.5 text-xs sm:text-sm text-stone-500 border-b border-stone-50 shrink-0">{hint}</p>

        {/* Map — flex-1 so it fills remaining space */}
        <div ref={mapRef} className="flex-1 min-h-0 w-full" />

        {/* Footer — safe-area-inset-bottom for iOS home bar */}
        <div
          className="px-4 sm:px-5 pt-3 pb-3 border-t border-stone-100 flex gap-3 shrink-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => { if (pendingLat != null && pendingLng != null) onConfirm(pendingLat, pendingLng) }}
            disabled={pendingLat == null}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={16} strokeWidth={2.5} />
            {confirmLabel}
          </button>
          <button
            onClick={onClose}
            className="px-5 border border-stone-200 text-stone-600 font-medium py-3.5 rounded-xl hover:bg-stone-50 active:bg-stone-100 transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
