'use client'

import { useEffect, useRef, useState } from 'react'
import { Ruler, TrendingUp } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

type GpxPoint = { lat: number; lon: number; ele: number }
type TrackStats = { distanceKm: number; elevationGainM: number }

function haversineKm(a: GpxPoint, b: GpxPoint): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLon = (b.lon - a.lon) * Math.PI / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function computeStats(points: GpxPoint[]): TrackStats {
  let distanceKm = 0
  let elevationGainM = 0
  for (let i = 1; i < points.length; i++) {
    distanceKm += haversineKm(points[i - 1], points[i])
    const delta = points[i].ele - points[i - 1].ele
    if (delta > 0) elevationGainM += delta
  }
  return { distanceKm, elevationGainM }
}

type GpxMapDict = {
  distance: string
  elevationGain: string
}

export default function GpxMap({
  approximateUrl,
  actualUrl,
  dict,
}: {
  approximateUrl: string | null
  actualUrl: string | null
  dict: GpxMapDict
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [approximateStats, setApproximateStats] = useState<TrackStats | null>(null)
  const [actualStats, setActualStats] = useState<TrackStats | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let map: import('leaflet').Map | null = null

    const init = async () => {
      const L = (await import('leaflet')).default

      const parseGpx = async (url: string): Promise<GpxPoint[]> => {
        const res = await fetch(url)
        const text = await res.text()
        const doc = new DOMParser().parseFromString(text, 'text/xml')
        return Array.from(doc.querySelectorAll('trkpt, wpt'))
          .map(p => ({
            lat: parseFloat(p.getAttribute('lat') ?? '0'),
            lon: parseFloat(p.getAttribute('lon') ?? '0'),
            ele: parseFloat(p.querySelector('ele')?.textContent ?? '0'),
          }))
          .filter(p => p.lat !== 0 || p.lon !== 0)
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
          const latLngs: [number, number][] = pts.map(p => [p.lat, p.lon])
          L.polyline(latLngs, { color: '#d97706', weight: 3, dashArray: '8 6', opacity: 0.8 }).addTo(map)
          bounds.push(latLngs)
          setApproximateStats(computeStats(pts))
        }
      }

      if (actualUrl) {
        const pts = await parseGpx(actualUrl)
        if (pts.length > 1) {
          const latLngs: [number, number][] = pts.map(p => [p.lat, p.lon])
          L.polyline(latLngs, { color: '#059669', weight: 3, opacity: 0.9 }).addTo(map)
          bounds.push(latLngs)
          setActualStats(computeStats(pts))
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

  const primaryStats = actualStats ?? approximateStats

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-stone-200"
        style={{ height: '340px' }}
      />
      {primaryStats && (
        <div className="flex flex-wrap gap-4 text-sm text-stone-600 px-1">
          <span className="flex items-center gap-1.5">
            <Ruler size={14} className="text-stone-400" />
            {primaryStats.distanceKm.toFixed(1)} km <span className="text-stone-400">{dict.distance}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-stone-400" />
            {Math.round(primaryStats.elevationGainM)} m <span className="text-stone-400">{dict.elevationGain}</span>
          </span>
        </div>
      )}
    </div>
  )
}
