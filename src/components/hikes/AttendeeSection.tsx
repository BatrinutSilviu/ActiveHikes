'use client'

import { useEffect, useState, useTransition } from 'react'
import { assignCarDriver, assignFriendCarDriver } from '@/app/actions/hikes'
import { Car, UserCheck, X } from 'lucide-react'
import { type CarTrip, tripCompatible, fitsInCar, seatsLeftByLeg, goesThere, goesBack } from '@/lib/carTrip'
import { apiFetch, isNetworkError, withTimeout } from '@/lib/net'
import { useDict } from '@/hooks/useDict'

type Participant = {
  id: string
  status: 'confirmed' | 'pending' | 'waitlist' | 'rejected'
  friendName: string | null
  hostParticipantId: string | null
  bringsCar: boolean
  carSeats: number | null
  carTrip: CarTrip
  carDriverParticipantId: string | null
  user: { name: string | null } | null
}

type AttendeeSectionDict = {
  title: string
  noConfirmedYet: string
  pendingCount: string
  waitlistCount: string
  noCarAssigned: string
  seatsLeft: string
  full: string
  hopIn: string
  leave: string
  yourCar: string
  friendOf: string
  you: string
  trip: { both: string; there: string; back: string; seatsThere: string; seatsBack: string }
}

function TripBadge({ trip, dict }: { trip: CarTrip; dict: AttendeeSectionDict['trip'] }) {
  if (trip === 'both') return null
  return (
    <span className="text-[11px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{dict[trip]}</span>
  )
}

function pName(p: Participant) {
  return p.user?.name ?? p.friendName ?? '?'
}

// Polled every 5s, so a failed poll isn't retried — the next one is the retry.
const POLL = { timeoutMs: 4000, retries: 0 }

export default function AttendeeSection({
  hikeId,
  participants: initialParticipants,
  userParticipantId,
  userFriendParticipantId,
  isUpcoming,
  dict,
}: {
  hikeId: string
  participants: Participant[]
  userParticipantId: string | null
  userFriendParticipantId?: string | null
  isUpcoming: boolean
  dict: AttendeeSectionDict
}) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const net = useDict().network

  const refetch = async () => {
    try {
      const res = await apiFetch(`/api/hikes/${hikeId}/carpool`, { cache: 'no-store', ...POLL })
      if (res.ok) setParticipants((await res.json()).participants)
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (!isUpcoming) return
    const interval = setInterval(refetch, 5000)
    return () => clearInterval(interval)
  }, [hikeId, isUpcoming])

  const confirmed = participants.filter(p => p.status === 'confirmed')
  const pendingCount = participants.filter(p => p.status === 'pending').length
  const waitlistCount = participants.filter(p => p.status === 'waitlist').length

  const userParticipant = participants.find(p => p.id === userParticipantId)
  const userIsDiver = userParticipant?.bringsCar ?? false
  const friendParticipant = participants.find(p => p.id === userFriendParticipantId)

  const runAssign = (action: () => Promise<unknown>) => {
    if (isPending) return
    setError('')
    startTransition(async () => {
      try {
        await withTimeout(action())
      } catch (err) {
        setError(isNetworkError(err) ? net.error : net.failed)
      }
      await refetch()
    })
  }

  const assign = (driverParticipantId: string | null) => runAssign(() => assignCarDriver(hikeId, driverParticipantId))
  const assignFriend = (driverParticipantId: string | null) => runAssign(() => assignFriendCarDriver(hikeId, driverParticipantId))

  const drivers = confirmed.filter(p => p.bringsCar && p.carSeats !== null)
  const hasCarpoolData = drivers.length > 0

  const hostNameOf = (p: Participant) =>
    p.hostParticipantId ? participants.find(h => h.id === p.hostParticipantId)?.user?.name ?? '?' : null

  return (
    <div>
      <h2 className="text-2xl font-bold text-stone-900 mb-4">{dict.title}</h2>

      {error && <p role="alert" className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl mb-3">{error}</p>}

      {confirmed.length === 0 ? (
        <p className="text-stone-400 text-sm">{dict.noConfirmedYet}</p>
      ) : hasCarpoolData ? (
        <div className="space-y-2">
          {drivers.map(driver => {
            const passengers = confirmed.filter(p => p.carDriverParticipantId === driver.id)
            const seats = Number(driver.carSeats)
            const legs = seatsLeftByLeg(seats, passengers.map(p => p.carTrip))
            const thereLeft = goesThere(driver.carTrip) ? Math.max(0, legs.there) : 0
            const backLeft = goesBack(driver.carTrip) ? Math.max(0, legs.back) : 0
            const isFull = thereLeft <= 0 && backLeft <= 0
            const seatsLabel = driver.carTrip === 'both' && thereLeft !== backLeft
              ? `${thereLeft} ${dict.trip.seatsThere} · ${backLeft} ${dict.trip.seatsBack} ${dict.seatsLeft}`
              : `${Math.max(thereLeft, backLeft)} ${dict.seatsLeft}`
            const isMyDriver = userParticipant?.carDriverParticipantId === driver.id
            const isMyOwnCar = userParticipantId === driver.id
            const isFriendsDriver = friendParticipant?.carDriverParticipantId === driver.id
            // Whether a group of riders could join this car (direction covered + a seat on each leg they need)
            const canTake = (group: Participant[]) => {
              if (group.some(g => !tripCompatible(driver.carTrip, g.carTrip))) return false
              const ids = group.map(g => g.id)
              const existing = passengers.filter(p => !ids.includes(p.id)).map(p => p.carTrip)
              return fitsInCar(seats, existing, group.map(g => g.carTrip))
            }
            // The user's friend moves along while they share the same car (or both have none)
            const userGroup = userParticipant
              ? (friendParticipant && friendParticipant.carDriverParticipantId === userParticipant.carDriverParticipantId
                ? [userParticipant, friendParticipant]
                : [userParticipant])
              : []
            const userCanJoin = userGroup.length > 0 && canTake(userGroup)
            const friendCanJoin = !!friendParticipant && canTake([friendParticipant])

            return (
              <div key={driver.id}
                className={`border rounded-xl p-4 ${isMyDriver || isMyOwnCar ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-semibold text-stone-800 flex-wrap">
                      <Car size={15} className="text-emerald-600 shrink-0" />
                      <span>{pName(driver)}</span>
                      <TripBadge trip={driver.carTrip} dict={dict.trip} />
                      {isMyOwnCar && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">{dict.yourCar}</span>
                      )}
                    </div>
                    {passengers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pl-5">
                        {passengers.map(p => (
                          <span key={p.id} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <UserCheck size={10} />
                            {pName(p)}
                            {p.hostParticipantId && <span className="text-stone-400"> ({dict.friendOf} {hostNameOf(p)})</span>}
                            <TripBadge trip={p.carTrip} dict={dict.trip} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {isUpcoming && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isFull ? 'bg-stone-100 text-stone-400' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isFull ? dict.full : seatsLabel}
                      </span>
                    )}

                    {isUpcoming && userParticipantId && !userIsDiver && !isMyOwnCar && (
                      <div className="flex items-center gap-1.5">
                        {friendParticipant && <span className="text-xs text-stone-400">{dict.you}</span>}
                        {isMyDriver ? (
                          <button onClick={() => assign(null)} disabled={isPending}
                            className="flex items-center gap-1 text-xs text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                            <X size={12} /> {dict.leave}
                          </button>
                        ) : userCanJoin && (
                          <button onClick={() => assign(driver.id)} disabled={isPending}
                            className="flex items-center gap-1 text-xs text-emerald-700 border border-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors">
                            <Car size={12} /> {dict.hopIn}
                          </button>
                        )}
                      </div>
                    )}

                    {isUpcoming && friendParticipant && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-stone-400">{pName(friendParticipant)}</span>
                        {isFriendsDriver ? (
                          <button onClick={() => assignFriend(null)} disabled={isPending}
                            className="flex items-center gap-1 text-xs text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                            <X size={12} /> {dict.leave}
                          </button>
                        ) : friendCanJoin && (
                          <button onClick={() => assignFriend(driver.id)} disabled={isPending}
                            className="flex items-center gap-1 text-xs text-emerald-700 border border-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors">
                            <Car size={12} /> {dict.hopIn}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {(() => {
            const withoutCar = confirmed.filter(p => !p.bringsCar && p.carDriverParticipantId === null)
            if (withoutCar.length === 0) return null
            return (
              <div className="border border-dashed border-stone-200 rounded-xl p-4">
                <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-2">{dict.noCarAssigned}</p>
                <div className="flex flex-wrap gap-1.5">
                  {withoutCar.map(p => (
                    <span key={p.id} className="bg-stone-50 border border-stone-200 text-stone-700 text-sm px-3 py-1 rounded-full">
                      {pName(p)}
                      {p.hostParticipantId && <span className="text-stone-400"> ({dict.friendOf} {hostNameOf(p)})</span>}
                      {p.carTrip !== 'both' && <span className="text-amber-600 text-xs"> · {dict.trip[p.carTrip]}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {confirmed.map(p => (
            <span key={p.id} className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1.5 rounded-full">
              {pName(p)}
              {p.hostParticipantId && <span className="text-emerald-600 font-normal"> ({dict.friendOf} {hostNameOf(p)})</span>}
            </span>
          ))}
        </div>
      )}

      {(pendingCount > 0 || waitlistCount > 0) && (
        <p className="text-stone-400 text-xs mt-3">
          {pendingCount > 0 && `${pendingCount} ${dict.pendingCount}`}
          {pendingCount > 0 && waitlistCount > 0 && ' · '}
          {waitlistCount > 0 && `${waitlistCount} ${dict.waitlistCount}`}
        </p>
      )}
    </div>
  )
}
