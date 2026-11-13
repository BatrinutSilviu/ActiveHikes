'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { cancelRegistration, updateCarPreference } from '@/app/actions/hikes'
import { isNetworkError, withTimeout } from '@/lib/net'
import { useDict } from '@/hooks/useDict'
import PaymentCountdown from './PaymentCountdown'
import { CarPreferenceFields, PickupLocationModal, clampSeats, initialCarPreference, type CarPreference } from './CarPreferenceFields'
import type { CarTripDict, JoinButtonDict, ParticipationStatus, Registration } from './types'

const STATUS_COLORS: Record<ParticipationStatus, string> = {
  pending: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  confirmed: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  rejected: 'bg-red-50 border-red-200 text-red-800',
  waitlist: 'bg-blue-50 border-blue-200 text-blue-800',
}

/** Status of an existing registration, its editable car preferences and the cancel button. */
export default function MyRegistration({
  hikeId,
  registration,
  waitlistPosition,
  waitlistCount,
  dict,
  tripDict,
}: {
  hikeId: string
  registration: Registration
  waitlistPosition: number | null
  waitlistCount: number
  dict: JoinButtonDict
  tripDict: CarTripDict
}) {
  const { status, paymentDeadline } = registration
  const saved = initialCarPreference(registration)
  const [car, setCar] = useState<CarPreference>(saved)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [carSaveError, setCarSaveError] = useState('')
  const [isSavingCar, startCarTransition] = useTransition()
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [, startCancelTransition] = useTransition()
  const router = useRouter()
  const networkError = useDict().network.error

  const updateCar = (patch: Partial<CarPreference>) => setCar(prev => ({ ...prev, ...patch }))

  // Seats only matter for drivers, so a passenger's leftover seat count isn't a change.
  const carChanged =
    car.bringsCar !== saved.bringsCar ||
    (car.bringsCar && clampSeats(car.seats) !== (registration.carSeats ?? 4)) ||
    car.trip !== saved.trip ||
    car.pickupLat !== saved.pickupLat ||
    car.pickupLng !== saved.pickupLng

  const handleSaveCar = () => {
    setCarSaveError('')
    startCarTransition(async () => {
      try {
        await withTimeout(updateCarPreference(
          hikeId,
          car.bringsCar,
          car.bringsCar ? clampSeats(car.seats) : undefined,
          car.pickupLat,
          car.pickupLng,
          car.trip,
        ))
        router.refresh()
      } catch (err) {
        setCarSaveError(isNetworkError(err) ? networkError : dict.carSaveError)
      }
    })
  }

  const handleCancel = () => {
    if (!confirm(dict.cancelConfirm)) return
    setCancelling(true)
    setCancelError('')
    startCancelTransition(async () => {
      try {
        await withTimeout(cancelRegistration(hikeId))
        router.refresh()
      } catch (err) {
        setCancelError(isNetworkError(err) ? networkError : dict.cancelError)
        setCancelling(false)
        // The cancellation may have gone through before the connection dropped — show the real state.
        router.refresh()
      }
    })
  }

  return (
    <>
      {showLocationModal && (
        <PickupLocationModal
          value={car}
          dict={dict}
          onConfirm={(pickupLat, pickupLng) => {
            updateCar({ pickupLat, pickupLng })
            setShowLocationModal(false)
          }}
          onClose={() => setShowLocationModal(false)}
        />
      )}

      <div className="space-y-3">
        <div className={`border rounded-xl p-4 text-center ${STATUS_COLORS[status]}`}>
          <div className="font-bold">{dict.status[status].label}</div>
          <p className="text-sm mt-1 opacity-80">{dict.status[status].desc}</p>
          {status === 'waitlist' && waitlistPosition && (
            <p className="text-sm mt-1 font-semibold">
              {dict.waitlistPosition
                .replace('{position}', String(waitlistPosition))
                .replace('{count}', String(waitlistCount))}
            </p>
          )}
          {status === 'pending' && paymentDeadline && (
            <PaymentCountdown deadline={paymentDeadline} dict={dict} />
          )}
        </div>

        <div className="border border-stone-200 rounded-xl p-3 space-y-3">
          <CarPreferenceFields
            value={car}
            onChange={updateCar}
            onPickLocation={() => setShowLocationModal(true)}
            dict={dict}
            tripDict={tripDict}
          />

          {carChanged && (
            <button
              onClick={handleSaveCar}
              disabled={isSavingCar}
              className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {isSavingCar ? dict.savingCarPreference : dict.saveCarPreference}
            </button>
          )}
          {carSaveError && <p className="text-red-600 text-xs text-center">{carSaveError}</p>}
        </div>

        {(status === 'pending' || status === 'waitlist') && (
          <button onClick={handleCancel} disabled={cancelling}
            className="w-full flex items-center justify-center gap-2 border-2 border-red-200 text-red-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-50 hover:border-red-400 active:bg-red-100 transition-colors disabled:opacity-50">
            <X size={15} strokeWidth={2.5} />
            {cancelling ? dict.cancelling : dict.cancelRegistration}
          </button>
        )}
        {cancelError && <p className="text-red-600 text-xs text-center mt-1">{cancelError}</p>}
      </div>
    </>
  )
}
