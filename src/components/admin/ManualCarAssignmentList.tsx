'use client'

import { useState, useTransition } from 'react'
import { adminAssignCarDriver } from '@/app/actions/hikes'

type Driver = {
  id: string
  name: string
  seats: number
}

type Participant = {
  id: string
  friendName: string | null
  hostParticipantId: string | null
  hostName: string | null
  linkedFriend: { id: string; name: string | null } | null
  bringsCar: boolean
  carDriverParticipantId: string | null
  user: { name: string | null } | null
}

type Dict = {
  noCar: string
  full: string
  error: string
  friendOf: string
  drivingOwnCar: string
}

export default function ManualCarAssignmentList({
  hikeId,
  participants: initialParticipants,
  drivers,
  dict,
}: {
  hikeId: string
  participants: Participant[]
  drivers: Driver[]
  dict: Dict
}) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  const occupancy = (driverId: string) =>
    participants.filter(p => p.carDriverParticipantId === driverId).length

  const handleChange = (p: Participant, driverId: string | null) => {
    setError('')
    setSavingId(p.id)
    startTransition(async () => {
      const result = await adminAssignCarDriver(hikeId, p.id, driverId)
      if ('error' in result) {
        setError(result.error)
      } else {
        setParticipants(prev => prev.map(item => item.id === p.id ? { ...item, carDriverParticipantId: driverId } : item))
      }
      setSavingId(null)
    })
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {participants.filter(p => !p.bringsCar).map(p => (
        <div key={p.id} className="bg-white border border-stone-100 rounded-xl p-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-stone-800 truncate">
            {p.user?.name ?? p.friendName ?? '?'}
            {p.linkedFriend && <span className="text-stone-400 font-normal"> +{p.linkedFriend.name}</span>}
            {p.hostParticipantId && <span className="text-stone-400 font-normal text-xs"> ({dict.friendOf} {p.hostName ?? '?'})</span>}
          </span>
          <select
            value={p.carDriverParticipantId ?? ''}
            disabled={savingId === p.id}
            onChange={e => handleChange(p, e.target.value || null)}
            className="border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            <option value="">{dict.noCar}</option>
            {drivers.map(driver => {
              const occExcludingSelf = participants.filter(x => x.carDriverParticipantId === driver.id && x.id !== p.id).length
              const occ = occupancy(driver.id)
              const isFull = occExcludingSelf + 1 > driver.seats
              return (
                <option key={driver.id} value={driver.id} disabled={isFull}>
                  {driver.name} — {occ}/{driver.seats}{isFull ? ` (${dict.full})` : ''}
                </option>
              )
            })}
          </select>
        </div>
      ))}
      {participants.filter(p => p.bringsCar).map(p => (
        <div key={p.id} className="bg-stone-50 border border-stone-100 rounded-xl p-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-stone-500 truncate">
            {p.user?.name ?? p.friendName ?? '?'}
          </span>
          <span className="text-xs text-stone-400 shrink-0">{dict.drivingOwnCar}</span>
        </div>
      ))}
    </div>
  )
}
