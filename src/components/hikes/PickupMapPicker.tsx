'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export default function PickupMapPicker({
  initialLat,
  initialLng,
  onChange,
}: {
  initialLat?: number | null
  initialLng?: number | null
  onChange: (lat: number, lng: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Store marker ref so we can move it without re-creating
  const markerRef = useRef<import('leaflet').Marker | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return

    let map: import('leaflet').Map | null = null

    const init = async () => {
      const L = (await import('leaflet')).default

      const container = containerRef.current!
      if ((container as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

      const defaultCenter: [number, number] = initialLat != null && initialLng != null
        ? [initialLat, initialLng]
        : [45.9, 24.96]
      const defaultZoom = initialLat != null ? 13 : 7

      map = L.map(container, { zoomControl: true, scrollWheelZoom: true })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      map.setView(defaultCenter, defaultZoom)

      const icon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 24 32">
          <path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 24 8 24s8-18.6 8-24c0-4.4-3.6-8-8-8z" fill="#059669"/>
          <circle cx="12" cy="8" r="3.5" fill="white"/>
        </svg>`,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        className: '',
      })

      const placeMarker = (lat: number, lng: number) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map!)
          markerRef.current.on('dragend', () => {
            const pos = markerRef.current!.getLatLng()
            onChangeRef.current(pos.lat, pos.lng)
          })
        }
        onChangeRef.current(lat, lng)
      }

      if (initialLat != null && initialLng != null) {
        placeMarker(initialLat, initialLng)
      }

      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        placeMarker(e.latlng.lat, e.latlng.lng)
      })
    }

    init()

    return () => {
      markerRef.current = null
      map?.remove()
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden border border-stone-200"
      style={{ height: '200px' }}
    />
  )
}
