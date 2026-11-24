'use client'

import { useState, useTransition } from 'react'
import { adminAssignCarDriver, adminSetGasPaid } from '@/app/actions/hikes'
import Dropdown from '@/components/Dropdown'
import { type CarTrip, tripCompatible, fitsInCar, seatsLeftByLeg } from '@/lib/carTrip'

type TripDict = { both: string; there: string; back: string; seatsThere: string; seatsBack: string }

function TripTag({ trip, dict }: { trip: CarTrip; dict: TripDict }) {
  if (trip === 'both') return null
  return <span className="ml-1.5 text-[11px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{dict[trip]}</span>
}

type Driver = {
  id: string
  name: string
  seats: number
  carTrip: CarTrip
}

type Participant = {
  id: string
  friendName: string | null
  hostParticipantId: string | null
  hostName: string | null
  linkedFriend: { id: string; name: string | null } | null
  bringsCar: boolean
  carTrip: CarTrip
  carDriverParticipantId: string | null
  gasPaid: boolean
  user: { name: string | null } | null
}

type Dict = {
  noCar: string
  full: string
  error: string
  friendOf: string
  drivingOwnCar: string
  gasPaid: string
  gasPaidCount: string
}

export default function ManualCarAssignmentList({
  hikeId,
  participants: initialParticipants,
  drivers,
  dict,
  tripDict,
}: {
  hikeId: string
  participants: Participant[]
  drivers: Driver[]
  dict: Dict
  tripDict: TripDict
}) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingGasId, setSavingGasId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  const ridersOf = (driverId: string) =>
    participants.filter(p => p.carDriverParticipantId === driverId)

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

  const handleGasPaid = (p: Participant, paid: boolean) => {
    setError('')
    setSavingGasId(p.id)
    setParticipants(prev => prev.map(item => item.id === p.id ? { ...item, gasPaid: paid } : item))
    startTransition(async () => {
      const result = await adminSetGasPaid(hikeId, p.id, paid)
      if ('error' in result) {
        setError(result.error)
        setParticipants(prev => prev.map(item => item.id === p.id ? { ...item, gasPaid: !paid } : item))
      }
      setSavingGasId(null)
    })
  }

  const gasCheckbox = (p: Participant) => (
    <label className="flex items-center gap-1.5 text-xs text-stone-600 shrink-0 cursor-pointer select-none" title={dict.gasPaid}>
      <input
        type="checkbox"
        checked={p.gasPaid}
        disabled={savingGasId === p.id}
        onChange={e => handleGasPaid(p, e.target.checked)}
        className="w-4 h-4 accent-emerald-600 disabled:opacity-50"
      />
      <span className="hidden sm:inline">{dict.gasPaid}</span>
    </label>
  )

  const gasPaidCount = participants.filter(p => p.gasPaid).length

  return (
    <div className="space-y-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <p className={`text-sm font-medium ${gasPaidCount === participants.length ? 'text-emerald-700' : 'text-stone-500'}`}>
        {dict.gasPaidCount.replace('{paid}', String(gasPaidCount)).replace('{total}', String(participants.length))}
      </p>
      {participants.filter(p => !p.bringsCar).map(p => (
        <div key={p.id} className="bg-white border border-stone-100 rounded-xl p-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-stone-800 min-w-0 [overflow-wrap:anywhere]">
            {p.user?.name ?? p.friendName ?? '?'}
            {p.linkedFriend && <span className="text-stone-400 font-normal"> +{p.linkedFriend.name}</span>}
            {p.hostParticipantId && <span className="text-stone-400 font-normal text-xs"> ({dict.friendOf} {p.hostName ?? '?'})</span>}
            <TripTag trip={p.carTrip} dict={tripDict} />
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <Dropdown
              size="sm"
              align="right"
              className="w-44 sm:w-60 shrink-0"
              value={p.carDriverParticipantId ?? ''}
              disabled={savingId === p.id}
              onChange={v => handleChange(p, v || null)}
              options={[
                { value: '', label: dict.noCar },
                ...drivers.map(driver => {
                  const riders = ridersOf(driver.id)
                  const others = riders.filter(x => x.id !== p.id).map(x => x.carTrip)
                  const compatible = tripCompatible(driver.carTrip, p.carTrip)
                  const isFull = !fitsInCar(driver.seats, others, [p.carTrip])
                  const left = seatsLeftByLeg(driver.seats, riders.map(x => x.carTrip))
                  const split = driver.carTrip === 'both' && left.there !== left.back
                  const used = split
                    ? `${driver.seats - left.there}/${driver.seats} ${tripDict.seatsThere} · ${driver.seats - left.back}/${driver.seats} ${tripDict.seatsBack}`
                    : `${driver.carTrip === 'back' ? driver.seats - left.back : driver.seats - left.there}/${driver.seats}`
                  const tone = !compatible ? 'bg-stone-100 text-stone-400' : isFull ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                  return {
                    value: driver.id,
                    label: driver.name,
                    disabled: !compatible || isFull,
                    hint: [driver.carTrip !== 'both' ? tripDict[driver.carTrip] : null, split ? used : null].filter(Boolean).join(' · ') || undefined,
                    badge: split && !(compatible && isFull) ? undefined : (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${tone}`}>
                        {compatible && isFull ? dict.full : used}
                      </span>
                    ),
                  }
                }),
              ]}
            />
            {gasCheckbox(p)}
          </div>
        </div>
      ))}
      {participants.filter(p => p.bringsCar).map(p => (
        <div key={p.id} className="bg-stone-50 border border-stone-100 rounded-xl p-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-stone-500 truncate">
            {p.user?.name ?? p.friendName ?? '?'}
            <TripTag trip={p.carTrip} dict={tripDict} />
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-stone-400">{dict.drivingOwnCar}</span>
            {gasCheckbox(p)}
          </div>
        </div>
      ))}
    </div>
  )
}
