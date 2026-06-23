'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export default function GpxMap({
  approximateUrl,
  actualUrl,
}: {
  approximateUrl: string | null
  actualUrl: string | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let map: import('leaflet').Map | null = null

    const init = async () => {
      const L = (await import('leaflet')).default

      const parseGpx = async (url: string): Promise<[number, number][]> => {
        const res = await fetch(url)
        const text = await res.text()
        const doc = new DOMParser().parseFromString(text, 'text/xml')
        return Array.from(doc.querySelectorAll('trkpt, wpt'))
          .map(p => [
            parseFloat(p.getAttribute('lat') ?? '0'),
            parseFloat(p.getAttribute('lon') ?? '0'),
          ] as [number, number])
          .filter(([lat, lon]) => lat !== 0 || lon !== 0)
      }

      const container = containerRef.current!
      if ((container as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

      map = L.map(container, { zoomControl: true, scrollWheelZoom: false })

      L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 17,
      }).addTo(map)

      const bounds: [number, number][][] = []

      if (approximateUrl) {
        const pts = await parseGpx(approximateUrl)
        if (pts.length > 1) {
          L.polyline(pts, { color: '#d97706', weight: 3, dashArray: '8 6', opacity: 0.8 }).addTo(map)
          bounds.push(pts)
        }
      }

      if (actualUrl) {
        const pts = await parseGpx(actualUrl)
        if (pts.length > 1) {
          L.polyline(pts, { color: '#059669', weight: 3, opacity: 0.9 }).addTo(map)
          bounds.push(pts)
        }
      }

      if (bounds.length > 0) {
        const allPts = bounds.flat()
        map.fitBounds(L.latLngBounds(allPts), { padding: [24, 24] })
      }
    }

    init()

    return () => {
      map?.remove()
    }
  }, [approximateUrl, actualUrl])

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden border border-stone-200"
      style={{ height: '340px' }}
    />
  )
}
