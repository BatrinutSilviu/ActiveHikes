'use client'

import { useState, useTransition } from 'react'
import { adminAssignRoom } from '@/app/actions/hikes'

type Room = {
  id: string
  type: 'double' | 'triple' | 'quadruple'
  label: string
  capacity: number
  occupied: number
}

type Participant = {
  id: string
  guestName: string | null
  roomId: string | null
  user: { name: string | null }
}

type Dict = {
  noRoom: string
  full: string
  error: string
}

export default function RoomAssignmentList({
  hikeId,
  participants: initialParticipants,
  rooms,
  roomTypeLabels,
  dict,
}: {
  hikeId: string
  participants: Participant[]
  rooms: Room[]
  roomTypeLabels: Record<string, string>
  dict: Dict
}) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  const occupancy = (roomId: string) =>
    participants.filter(p => p.roomId === roomId).length

  const handleChange = (participantId: string, roomId: string | null) => {
    setError('')
    setSavingId(participantId)
    startTransition(async () => {
      try {
        await adminAssignRoom(hikeId, participantId, roomId)
        setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, roomId } : p))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : dict.error)
      }
      setSavingId(null)
    })
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {participants.map(p => (
        <div key={p.id} className="bg-white border border-stone-100 rounded-xl p-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-stone-800 truncate">
            {p.user.name ?? '?'}{p.guestName && <span className="text-stone-400 font-normal"> +{p.guestName}</span>}
          </span>
          <select
            value={p.roomId ?? ''}
            disabled={savingId === p.id}
            onChange={e => handleChange(p.id, e.target.value || null)}
            className="border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            <option value="">{dict.noRoom}</option>
            {rooms.map(room => {
              const occ = occupancy(room.id)
              const isFull = occ >= room.capacity && room.id !== p.roomId
              return (
                <option key={room.id} value={room.id} disabled={isFull}>
                  {roomTypeLabels[room.type] ?? room.type} {room.label} — {occ}/{room.capacity}{isFull ? ` (${dict.full})` : ''}
                </option>
              )
            })}
          </select>
        </div>
      ))}
    </div>
  )
}
