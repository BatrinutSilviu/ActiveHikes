'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignCarDriver } from '@/app/actions/hikes'
import { Car, UserCheck, X } from 'lucide-react'

type Driver = {
  participantId: string
  driverName: string
  carSeats: number
  passengers: { participantId: string; name: string }[]
}

type CarpoolSectionDict = {
  title: string
  seatsLeft: string
  full: string
  hopIn: string
  leave: string
  noDrivers: string
  yourCar: string
}

export default function CarpoolSection({
  hikeId,
  drivers,
  userParticipantId,
  userDriverParticipantId,
  userIsDiver,
  dict,
}: {
  hikeId: string
  drivers: Driver[]
  userParticipantId: string | null
  userDriverParticipantId: string | null
  userIsDiver: boolean
  dict: CarpoolSectionDict
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const assign = (driverParticipantId: string | null) => {
    startTransition(async () => {
      await assignCarDriver(hikeId, driverParticipantId)
      router.refresh()
    })
  }

  if (drivers.length === 0) return null

  return (
    <div>
      <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center gap-2">
        <Car size={22} /> {dict.title}
      </h2>

      <div className="space-y-3">
        {drivers.map(driver => {
          const taken = driver.passengers.length
          const left = driver.carSeats - taken
          const isFull = left <= 0
          const isMyDriver = userDriverParticipantId === driver.participantId
          const isMyOwnCar = userParticipantId === driver.participantId

          return (
            <div
              key={driver.participantId}
              className={`bg-white border rounded-xl p-4 ${isMyDriver ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold text-stone-800">
                    <Car size={15} className="text-emerald-600 shrink-0" />
                    {driver.driverName}
                    {isMyOwnCar && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{dict.yourCar}</span>
                    )}
                  </div>

                  {driver.passengers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {driver.passengers.map(p => (
                        <span key={p.participantId} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <UserCheck size={10} /> {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isFull ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isFull ? dict.full : `${left} ${dict.seatsLeft}`}
                  </span>

                  {userParticipantId && !userIsDiver && !isMyOwnCar && (
                    isMyDriver ? (
                      <button
                        onClick={() => assign(null)}
                        disabled={isPending}
                        className="flex items-center gap-1 text-xs text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <X size={12} /> {dict.leave}
                      </button>
                    ) : (
                      !isFull && (
                        <button
                          onClick={() => assign(driver.participantId)}
                          disabled={isPending}
                          className="flex items-center gap-1 text-xs text-emerald-700 border border-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                        >
                          <Car size={12} /> {dict.hopIn}
                        </button>
                      )
                    )
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
