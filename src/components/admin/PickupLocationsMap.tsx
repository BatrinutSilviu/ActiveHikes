'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

type Pin = { id: string; label: string; lat: number; lng: number }

type Dict = {
  loadingAddress: string
  addressUnavailable: string
  openInMaps: string
}

export default function PickupLocationsMap({ pins, dict }: { pins: Pin[]; dict: Dict }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return

    let map: import('leaflet').Map | null = null

    const init = async () => {
      const L = (await import('leaflet')).default

      const container = containerRef.current!
      if ((container as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

      map = L.map(container, { zoomControl: true, scrollWheelZoom: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      const icon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 32">
          <path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 24 8 24s8-18.6 8-24c0-4.4-3.6-8-8-8z" fill="#059669"/>
          <circle cx="12" cy="8" r="3.5" fill="white"/>
        </svg>`,
        iconSize: [24, 30],
        iconAnchor: [12, 30],
        className: '',
      })

      for (const pin of pins) {
        const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map)
        const popupId = `pickup-address-${pin.id}`
        const mapsUrl = `https://www.google.com/maps?q=${pin.lat},${pin.lng}`
        marker.bindPopup(
          `<div style="min-width:180px">
            <div style="font-weight:600;margin-bottom:4px">${escapeHtml(pin.label)}</div>
            <div id="${popupId}" style="font-size:12px;color:#78716c;margin-bottom:6px">${dict.loadingAddress}</div>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#059669;font-weight:600">${dict.openInMaps} →</a>
          </div>`
        )
        marker.on('popupopen', () => {
          fetch(`/api/geocode/reverse?lat=${pin.lat}&lng=${pin.lng}`)
            .then(r => r.json())
            .then(data => {
              const el = document.getElementById(popupId)
              if (el) el.textContent = data.address ?? dict.addressUnavailable
            })
            .catch(() => {
              const el = document.getElementById(popupId)
              if (el) el.textContent = dict.addressUnavailable
            })
        })
      }

      if (pins.length === 1) {
        map.setView([pins[0].lat, pins[0].lng], 12)
      } else {
        map.fitBounds(L.latLngBounds(pins.map(p => [p.lat, p.lng] as [number, number])), { padding: [30, 30] })
      }
      setTimeout(() => map?.invalidateSize(), 50)
    }

    init()
    return () => { map?.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins])

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden border border-stone-200"
      style={{ height: '280px' }}
    />
  )
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
