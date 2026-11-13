'use client'

import { useEffect, useRef, useState } from 'react'
import { Ruler, TrendingUp } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { apiFetch } from '@/lib/net'

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
  start: string
  finish: string
  startFinish: string
}

// Start / finish markers: big round pins with a white ring and a label, so the ends of the route are
// easy to spot. A loop (ends within 150 m of each other) gets one "start & finish" pin.
const FLAG = '<path d="M5 21V4m0 0h11l-2 4 2 4H5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
const PLAY = '<path d="M9 6.5v11l9-5.5z" fill="#fff"/>'
const pinHtml = (background: string, icon: string) =>
  `<div style="width:30px;height:30px;border-radius:50%;background:${background};border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="16" height="16">${icon}</svg></div>`

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
        const res = await apiFetch(url)
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

      // Routes in colours OpenTopoMap doesn't use (its roads and contours are orange/brown, forests green),
      // over a white outline, so they stand out on any terrain.
      const drawRoute = (latLngs: [number, number][], color: string, dashArray?: string) => {
        L.polyline(latLngs, { color: '#ffffff', weight: 8, opacity: 0.85, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map!)
        L.polyline(latLngs, { color, weight: 4.5, opacity: 1, dashArray, lineCap: 'round', lineJoin: 'round' }).addTo(map!)
      }

      if (approximateUrl) {
        const pts = await parseGpx(approximateUrl)
        if (pts.length > 1) {
          const latLngs: [number, number][] = pts.map(p => [p.lat, p.lon])
          drawRoute(latLngs, '#e6007e', '10 7') // planned route: magenta, dashed
          bounds.push(latLngs)
          setApproximateStats(computeStats(pts))
        }
      }

      if (actualUrl) {
        const pts = await parseGpx(actualUrl)
        if (pts.length > 1) {
          const latLngs: [number, number][] = pts.map(p => [p.lat, p.lon])
          drawRoute(latLngs, '#6d28d9') // recorded track: violet
          bounds.push(latLngs)
          setActualStats(computeStats(pts))
        }
      }

      // Ends of the main track: the recorded one when there is one, otherwise the planned route.
      const track = bounds[bounds.length - 1]
      if (track && track.length > 1) {
        const first = track[0], last = track[track.length - 1]
        const loop = haversineKm({ lat: first[0], lon: first[1], ele: 0 }, { lat: last[0], lon: last[1], ele: 0 }) < 0.15
        const pin = (at: [number, number], background: string, icon: string, label: string) =>
          L.marker(at, {
            icon: L.divIcon({ html: pinHtml(background, icon), className: '', iconSize: [30, 30], iconAnchor: [15, 15] }),
            title: label, keyboard: false, zIndexOffset: 1000,
          }).bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -16], className: 'route-end-label' }).addTo(map!)
        if (loop) pin(first, 'linear-gradient(90deg,#16a34a 50%,#111827 50%)', FLAG, dict.startFinish)
        else {
          pin(last, '#111827', FLAG, dict.finish)
          pin(first, '#16a34a', PLAY, dict.start)
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
  }, [approximateUrl, actualUrl]) // eslint-disable-line react-hooks/exhaustive-deps -- dict labels don't change

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
