'use client'

import { useState, useTransition } from 'react'
import { assignRoom } from '@/app/actions/hikes'
import { BedDouble } from 'lucide-react'

type Room = {
  id: string
  type: 'double' | 'triple' | 'quadruple'
  label: string
  capacity: number
  occupied: number
}

type RoomPickerDict = {
  title: string
  choose: string
  none: string
  full: string
  save: string
  saving: string
  error: string
  typeLabels: Record<string, string>
}

export default function RoomPicker({
  hikeId,
  rooms,
  currentRoomId,
  dict,
}: {
  hikeId: string
  rooms: Room[]
  currentRoomId: string | null
  dict: RoomPickerDict
}) {
  const [selected, setSelected] = useState(currentRoomId ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSave = () => {
    setError('')
    startTransition(async () => {
      try {
        await assignRoom(hikeId, selected || null)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : dict.error)
      }
    })
  }

  return (
    <div className="border border-stone-200 rounded-xl p-3 space-y-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-stone-600">
        <BedDouble size={15} className="text-blue-600" />
        {dict.title}
      </span>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">{dict.none}</option>
        {rooms.map(room => {
          const isFull = room.occupied >= room.capacity && room.id !== currentRoomId
          return (
            <option key={room.id} value={room.id} disabled={isFull}>
              {dict.typeLabels[room.type]} {room.label} — {room.occupied}/{room.capacity}{isFull ? ` (${dict.full})` : ''}
            </option>
          )
        })}
      </select>
      {selected !== (currentRoomId ?? '') && (
        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
        >
          {isPending ? dict.saving : dict.save}
        </button>
      )}
      {error && <p className="text-red-600 text-xs text-center">{error}</p>}
    </div>
  )
}
