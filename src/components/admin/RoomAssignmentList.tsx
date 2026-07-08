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
  friendName: string | null
  hostParticipantId: string | null
  hostName: string | null
  linkedFriend: { id: string; name: string | null } | null
  roomId: string | null
  user: { name: string | null } | null
}

type Dict = {
  noRoom: string
  full: string
  error: string
  friendOf: string
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

  const siblingId = (p: Participant) => p.hostParticipantId ?? p.linkedFriend?.id ?? null

  const occupancy = (roomId: string) =>
    participants.filter(p => p.roomId === roomId).length

  const handleChange = (p: Participant, roomId: string | null) => {
    setError('')
    setSavingId(p.id)
    const sibId = siblingId(p)
    startTransition(async () => {
      try {
        await adminAssignRoom(hikeId, p.id, roomId)
        setParticipants(prev => prev.map(item => (item.id === p.id || item.id === sibId) ? { ...item, roomId } : item))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : dict.error)
      }
      setSavingId(null)
    })
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {participants.map(p => {
        const sibId = siblingId(p)
        const neededSeats = sibId ? 2 : 1
        return (
          <div key={p.id} className="bg-white border border-stone-100 rounded-xl p-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-stone-800 truncate">
              {p.hostParticipantId ? p.friendName : p.user?.name ?? '?'}
              {p.linkedFriend && <span className="text-stone-400 font-normal"> +{p.linkedFriend.name}</span>}
              {p.hostParticipantId && <span className="text-stone-400 font-normal text-xs"> ({dict.friendOf} {p.hostName ?? '?'})</span>}
            </span>
            <select
              value={p.roomId ?? ''}
              disabled={savingId === p.id}
              onChange={e => handleChange(p, e.target.value || null)}
              className="border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              <option value="">{dict.noRoom}</option>
              {rooms.map(room => {
                const occExcludingPair = participants.filter(x => x.roomId === room.id && x.id !== p.id && x.id !== sibId).length
                const occ = occupancy(room.id)
                const isFull = occExcludingPair + neededSeats > room.capacity
                return (
                  <option key={room.id} value={room.id} disabled={isFull}>
                    {roomTypeLabels[room.type] ?? room.type} {room.label} — {occ}/{room.capacity}{isFull ? ` (${dict.full})` : ''}
                  </option>
                )
              })}
            </select>
          </div>
        )
      })}
    </div>
  )
}
