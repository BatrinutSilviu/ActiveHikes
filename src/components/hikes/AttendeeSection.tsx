'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignCarDriver } from '@/app/actions/hikes'
import { Car, UserCheck, X } from 'lucide-react'

type Participant = {
  id: string
  status: 'confirmed' | 'pending' | 'waitlist' | 'rejected'
  guestName: string | null
  bringsCar: boolean
  carSeats: number | null
  carDriverParticipantId: string | null
  user: { name: string | null }
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
}

function pName(p: Participant) {
  return p.user.name ?? '?'
}

export default function AttendeeSection({
  hikeId,
  participants,
  userParticipantId,
  isUpcoming,
  dict,
}: {
  hikeId: string
  participants: Participant[]
  userParticipantId: string | null
  isUpcoming: boolean
  dict: AttendeeSectionDict
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const confirmed = participants.filter(p => p.status === 'confirmed')
  const pendingCount = participants.filter(p => p.status === 'pending').length
  const waitlistCount = participants.filter(p => p.status === 'waitlist').length

  const userParticipant = participants.find(p => p.id === userParticipantId)
  const userIsDiver = userParticipant?.bringsCar ?? false

  const assign = (driverParticipantId: string | null) => {
    startTransition(async () => {
      await assignCarDriver(hikeId, driverParticipantId)
      router.refresh()
    })
  }

  const drivers = confirmed.filter(p => p.bringsCar && p.carSeats !== null)
  const hasCarpoolData = isUpcoming && drivers.length > 0

  return (
    <div>
      <h2 className="text-2xl font-bold text-stone-900 mb-4">{dict.title}</h2>

      {confirmed.length === 0 ? (
        <p className="text-stone-400 text-sm">{dict.noConfirmedYet}</p>
      ) : hasCarpoolData ? (
        <div className="space-y-2">
          {drivers.map(driver => {
            const passengers = confirmed.filter(p => p.carDriverParticipantId === driver.id)
            const left = Number(driver.carSeats) - passengers.length
            const isFull = left <= 0
            const isMyDriver = userParticipant?.carDriverParticipantId === driver.id
            const isMyOwnCar = userParticipantId === driver.id

            return (
              <div key={driver.id}
                className={`border rounded-xl p-4 ${isMyDriver || isMyOwnCar ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-semibold text-stone-800 flex-wrap">
                      <Car size={15} className="text-emerald-600 shrink-0" />
                      <span>{pName(driver)}{driver.guestName && <span className="font-normal text-stone-500"> +{driver.guestName}</span>}</span>
                      {isMyOwnCar && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">{dict.yourCar}</span>
                      )}
                    </div>
                    {passengers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pl-5">
                        {passengers.map(p => (
                          <span key={p.id} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <UserCheck size={10} />
                            {pName(p)}{p.guestName && ` +${p.guestName}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isFull ? 'bg-stone-100 text-stone-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isFull ? dict.full : `${left} ${dict.seatsLeft}`}
                    </span>

                    {userParticipantId && !userIsDiver && !isMyOwnCar && (
                      isMyDriver ? (
                        <button onClick={() => assign(null)} disabled={isPending}
                          className="flex items-center gap-1 text-xs text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                          <X size={12} /> {dict.leave}
                        </button>
                      ) : !isFull && (
                        <button onClick={() => assign(driver.id)} disabled={isPending}
                          className="flex items-center gap-1 text-xs text-emerald-700 border border-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors">
                          <Car size={12} /> {dict.hopIn}
                        </button>
                      )
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
                      {pName(p)}{p.guestName && <span className="text-stone-400"> +{p.guestName}</span>}
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
              {pName(p)}{p.guestName && <span className="text-emerald-600 font-normal"> +{p.guestName}</span>}
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
