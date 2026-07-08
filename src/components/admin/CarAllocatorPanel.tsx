'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { previewCarAllocation, applyCarAllocation, type AllocationPreview } from '@/app/actions/hikes'
import { Car, MapPin, AlertTriangle, CheckCircle, Shuffle } from 'lucide-react'

type Dict = {
  title: string
  previewBtn: string
  previewing: string
  applyBtn: string
  applying: string
  cancelBtn: string
  noDrivers: string
  noUnassigned: string
  allAssigned: string
  unassignedTitle: string
  noLocationWarning: string
  distanceKm: string
  roundRobin: string
  applied: string
  friendLabel: string
}

export default function CarAllocatorPanel({
  hikeId,
  dict,
}: {
  hikeId: string
  dict: Dict
}) {
  const [preview, setPreview] = useState<AllocationPreview | null>(null)
  const [done, setDone] = useState(false)
  const [isPreviewing, startPreview] = useTransition()
  const [isApplying, startApply] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  const handlePreview = () => {
    setError('')
    setDone(false)
    startPreview(async () => {
      try {
        const result = await previewCarAllocation(hikeId)
        setPreview(result)
      } catch {
        setError('Failed to generate preview.')
      }
    })
  }

  const handleApply = () => {
    if (!preview) return
    const assignments = preview.drivers.flatMap(d =>
      d.passengers.map(p => ({ passengerId: p.passengerId, driverId: d.driverId }))
    )
    setError('')
    startApply(async () => {
      try {
        await applyCarAllocation(hikeId, assignments)
        setPreview(null)
        setDone(true)
        router.refresh()
      } catch {
        setError('Failed to apply allocation.')
      }
    })
  }

  const totalAssigned = preview?.drivers.reduce((s, d) => s + d.passengers.length, 0) ?? 0

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shuffle size={18} className="text-emerald-600 shrink-0" />
        <h2 className="text-lg sm:text-xl font-bold text-stone-800">{dict.title}</h2>
      </div>

      {done && (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium mb-3">
          <CheckCircle size={16} className="shrink-0" /> {dict.applied}
        </div>
      )}

      {!preview && (
        <button
          onClick={handlePreview}
          disabled={isPreviewing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-900 active:bg-stone-950 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors disabled:opacity-60"
        >
          <Car size={15} />
          {isPreviewing ? dict.previewing : dict.previewBtn}
        </button>
      )}

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      {preview && (
        <div className="space-y-4">
          {preview.noLocationCount > 0 && (
            <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{dict.noLocationWarning.replace('{n}', String(preview.noLocationCount))}</span>
            </div>
          )}

          {preview.drivers.length === 0 && (
            <p className="text-stone-400 text-sm">{dict.noDrivers}</p>
          )}

          {preview.drivers.length > 0 && totalAssigned === 0 && (
            <p className="text-stone-400 text-sm">{dict.noUnassigned}</p>
          )}

          {preview.drivers.map(driver => {
            if (driver.passengers.length === 0) return null
            return (
              <div key={driver.driverId} className="border border-stone-200 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 font-semibold text-stone-800 mb-2">
                  <Car size={15} className="text-emerald-600 shrink-0" />
                  <span className="truncate">
                    {driver.driverName}
                    {driver.friendName && <span className="font-normal text-stone-500"> + {driver.friendName} ({dict.friendLabel})</span>}
                  </span>
                </div>
                <div className="space-y-1.5 pl-5">
                  {driver.passengers.map(p => (
                    <div key={p.passengerId} className="flex items-start gap-2 text-sm text-stone-600">
                      <MapPin size={12} className="text-stone-400 shrink-0 mt-0.5" />
                      <span className="flex-1 min-w-0 break-words">
                        {p.passengerName}
                        {p.friendName && <span className="text-stone-400"> + {p.friendName} ({dict.friendLabel})</span>}
                      </span>
                      <span className="text-stone-400 text-xs shrink-0 mt-0.5">
                        {p.distanceKm != null
                          ? `${p.distanceKm.toFixed(1)} ${dict.distanceKm}`
                          : dict.roundRobin}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {preview.unassigned.length > 0 && (
            <div className="border border-dashed border-red-200 rounded-xl p-3 sm:p-4">
              <p className="text-xs text-red-500 font-medium uppercase tracking-wide mb-2">{dict.unassignedTitle}</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.unassigned.map(p => (
                  <span key={p.id} className="text-xs bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 rounded-full">
                    {p.name}{p.friendName && ` + ${p.friendName} (${dict.friendLabel})`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {totalAssigned > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
              >
                {isApplying ? dict.applying : dict.applyBtn}
              </button>
              <button
                onClick={() => setPreview(null)}
                disabled={isApplying}
                className="sm:px-5 border border-stone-200 text-stone-600 text-sm font-medium py-3 rounded-xl hover:bg-stone-50 active:bg-stone-100 transition-colors disabled:opacity-60"
              >
                {dict.cancelBtn}
              </button>
            </div>
          )}

          {totalAssigned === 0 && (
            <button
              onClick={() => setPreview(null)}
              className="text-sm text-stone-500 hover:text-stone-700 underline py-1"
            >
              {dict.cancelBtn}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
