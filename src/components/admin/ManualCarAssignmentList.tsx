'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminAllowDriving, adminAssignCarDriver, adminMakeDriver, adminRevokeDriver, adminSetDriverTrip, adminSetGasExempt, adminSetGasPaid } from '@/app/actions/hikes'
import Dropdown from '@/components/Dropdown'
import { type CarTrip, tripCompatible, fitsInCar, seatsLeftByLeg } from '@/lib/carTrip'

type TripDict = { label: string; both: string; there: string; back: string; seatsThere: string; seatsBack: string }

function TripTag({ trip, dict }: { trip: CarTrip; dict: TripDict }) {
  if (trip === 'both') return null
  return <span className="ml-1.5 text-[11px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">{dict[trip]}</span>
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
  gasExempt: boolean
  driverLocked: boolean
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
  gasExempt: string
  gasExemptCount: string
  revokeDriver: string
  revokeDriverConfirm: string
  allowDriving: string
  makeDriver: string
  makeDriverSeats: string
  driverTripConfirm: string
}

export default function ManualCarAssignmentList({
  hikeId,
  participants: initialParticipants,
  drivers: initialDrivers,
  dict,
  tripDict,
}: {
  hikeId: string
  participants: Participant[]
  drivers: Driver[]
  dict: Dict
  tripDict: TripDict
}) {
  const router = useRouter()
  const [participants, setParticipants] = useState(initialParticipants)
  const [drivers, setDrivers] = useState(initialDrivers)
  const [revokingId, setRevokingId] = useState<string | null>(null)
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

  const handleRevokeDriver = (p: Participant) => {
    if (!confirm(dict.revokeDriverConfirm.replace('{name}', p.user?.name ?? p.friendName ?? '?'))) return
    setError('')
    setRevokingId(p.id)
    startTransition(async () => {
      const result = await adminRevokeDriver(hikeId, p.id)
      if ('error' in result) {
        setError(result.error)
      } else {
        setDrivers(prev => prev.filter(d => d.id !== p.id))
        setParticipants(prev => prev.map(item =>
          item.id === p.id ? { ...item, bringsCar: false, driverLocked: true, carDriverParticipantId: null }
          : item.carDriverParticipantId === p.id ? { ...item, carDriverParticipantId: null }
          : item))
      }
      setRevokingId(null)
    })
  }

  const handleMakeDriver = (p: Participant) => {
    const name = p.user?.name ?? p.friendName ?? '?'
    const answer = prompt(dict.makeDriverSeats.replace('{name}', name), '4')
    if (answer === null) return
    const seats = parseInt(answer, 10)
    if (!(seats >= 1 && seats <= 8)) { setError(dict.makeDriverSeats.replace('{name}', name)); return }
    setError('')
    setRevokingId(p.id)
    startTransition(async () => {
      const result = await adminMakeDriver(hikeId, p.id, seats)
      if ('error' in result) {
        setError(result.error)
      } else {
        setParticipants(prev => prev.map(item => item.id === p.id
          ? { ...item, bringsCar: true, driverLocked: false, carDriverParticipantId: null }
          : item))
        setDrivers(prev => [...prev, { id: p.id, name, seats: result.seats, carTrip: p.carTrip }])
      }
      setRevokingId(null)
    })
  }

  const handleDriverTrip = (p: Participant, trip: CarTrip) => {
    if (trip === p.carTrip) return
    const friendId = p.linkedFriend?.id ?? null
    const friendInCar = participants.some(x => x.id === friendId && x.carDriverParticipantId === p.id)
    const losing = participants.filter(x => x.carDriverParticipantId === p.id && x.id !== friendId && !tripCompatible(trip, x.carTrip))
    if (losing.length && !confirm(dict.driverTripConfirm
      .replace('{trip}', tripDict[trip])
      .replace('{names}', losing.map(x => x.user?.name ?? x.friendName ?? '?').join(', ')))) return
    setError('')
    setRevokingId(p.id)
    startTransition(async () => {
      const result = await adminSetDriverTrip(hikeId, p.id, trip)
      if ('error' in result) {
        setError(result.error)
      } else {
        const released = new Set(result.releasedIds)
        setParticipants(prev => prev.map(item =>
          item.id === p.id || (friendInCar && item.id === friendId) ? { ...item, carTrip: trip }
          : released.has(item.id) ? { ...item, carDriverParticipantId: null }
          : item))
        setDrivers(prev => prev.map(d => d.id === p.id ? { ...d, carTrip: trip } : d))
      }
      setRevokingId(null)
    })
  }

  const handleAllowDriving = (p: Participant) => {
    setError('')
    setRevokingId(p.id)
    startTransition(async () => {
      const result = await adminAllowDriving(hikeId, p.id)
      if ('error' in result) setError(result.error)
      else setParticipants(prev => prev.map(item => item.id === p.id ? { ...item, driverLocked: false } : item))
      setRevokingId(null)
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

  const handleGasExempt = (p: Participant, exempt: boolean) => {
    setError('')
    setSavingGasId(p.id)
    setParticipants(prev => prev.map(item => item.id === p.id ? { ...item, gasExempt: exempt } : item))
    startTransition(async () => {
      const result = await adminSetGasExempt(hikeId, p.id, exempt)
      if ('error' in result) {
        setError(result.error)
        setParticipants(prev => prev.map(item => item.id === p.id ? { ...item, gasExempt: !exempt } : item))
      } else {
        router.refresh() // the gas calculator's head count leaves exempt people out
      }
      setSavingGasId(null)
    })
  }

  const gasCheckbox = (p: Participant) => (
    <div className="flex items-center gap-3 shrink-0">
      <label className={`flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer select-none ${p.gasExempt ? 'opacity-40' : ''}`} title={dict.gasPaid}>
        <input
          type="checkbox"
          checked={p.gasPaid && !p.gasExempt}
          disabled={savingGasId === p.id || p.gasExempt}
          onChange={e => handleGasPaid(p, e.target.checked)}
          className="w-4 h-4 accent-emerald-600 disabled:opacity-50"
        />
        <span className="hidden sm:inline">{dict.gasPaid}</span>
      </label>
      <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer select-none" title={dict.gasExempt}>
        <input
          type="checkbox"
          checked={p.gasExempt}
          disabled={savingGasId === p.id}
          onChange={e => handleGasExempt(p, e.target.checked)}
          className="w-4 h-4 accent-amber-500 disabled:opacity-50"
        />
        <span className="hidden sm:inline">{dict.gasExempt}</span>
      </label>
    </div>
  )

  const payers = participants.filter(p => !p.gasExempt)
  const gasPaidCount = payers.filter(p => p.gasPaid).length
  const exemptCount = participants.length - payers.length

  return (
    <div className="space-y-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <p className={`text-sm font-medium ${gasPaidCount === payers.length ? 'text-emerald-700' : 'text-stone-500'}`}>
        {dict.gasPaidCount.replace('{paid}', String(gasPaidCount)).replace('{total}', String(payers.length))}
        {exemptCount > 0 && <span className="text-stone-400 font-normal"> · {dict.gasExemptCount.replace('{count}', String(exemptCount))}</span>}
      </p>
      {participants.filter(p => !p.bringsCar).map(p => (
        <div key={p.id} className="bg-white border border-stone-100 rounded-xl p-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-stone-800 min-w-0 [overflow-wrap:anywhere]">
            {p.user?.name ?? p.friendName ?? '?'}
            {p.linkedFriend && <span className="text-stone-400 font-normal"> +{p.linkedFriend.name}</span>}
            {p.hostParticipantId && <span className="text-stone-400 font-normal text-xs"> ({dict.friendOf} {p.hostName ?? '?'})</span>}
            <TripTag trip={p.carTrip} dict={tripDict} />
            {p.driverLocked && (
              <button
                type="button"
                onClick={() => handleAllowDriving(p)}
                disabled={revokingId === p.id}
                className="ml-2 text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
              >
                {dict.allowDriving}
              </button>
            )}
            {!p.hostParticipantId && (
              <button
                type="button"
                onClick={() => handleMakeDriver(p)}
                disabled={revokingId === p.id}
                className="ml-2 text-xs font-medium text-sky-700 hover:underline disabled:opacity-50"
              >
                {dict.makeDriver}
              </button>
            )}
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
          <span className="text-sm font-medium text-stone-500 min-w-0 [overflow-wrap:anywhere]">
            {p.user?.name ?? p.friendName ?? '?'}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-stone-400 hidden sm:inline">{dict.drivingOwnCar}</span>
            <Dropdown
              size="sm"
              align="right"
              className="w-32 shrink-0"
              ariaLabel={tripDict.label}
              value={p.carTrip}
              disabled={revokingId === p.id}
              onChange={v => handleDriverTrip(p, v as CarTrip)}
              options={(['both', 'there', 'back'] as const).map(t => ({ value: t, label: tripDict[t] }))}
            />
            <button
              type="button"
              onClick={() => handleRevokeDriver(p)}
              disabled={revokingId === p.id}
              className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
            >
              {dict.revokeDriver}
            </button>
            {gasCheckbox(p)}
          </div>
        </div>
      ))}
    </div>
  )
}
