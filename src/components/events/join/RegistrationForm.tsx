'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { joinHike } from '@/app/actions/hikes'
import { isNetworkError, withTimeout } from '@/lib/net'
import { useDict } from '@/hooks/useDict'
import { CarPreferenceFields, PickupLocationModal, clampSeats, initialCarPreference, type CarPreference } from './CarPreferenceFields'
import type { CarTripDict, JoinButtonDict } from './types'

/** Sign-up form for a user who isn't registered for the event yet. */
export default function RegistrationForm({
  hikeId,
  isFull,
  dict,
  tripDict,
  lang,
}: {
  hikeId: string
  isFull: boolean
  dict: JoinButtonDict
  tripDict: CarTripDict
  lang: string
}) {
  const [bringingFriend, setBringingFriend] = useState(false)
  const [friendName, setFriendName] = useState('')
  const [car, setCar] = useState<CarPreference>(() => initialCarPreference())
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const networkError = useDict().network.error

  const updateCar = (patch: Partial<CarPreference>) => setCar(prev => ({ ...prev, ...patch }))
  const friend = bringingFriend ? friendName.trim() : ''

  const handleJoin = () => {
    if (isPending) return
    setError('')
    startTransition(async () => {
      try {
        await withTimeout(joinHike(
          hikeId,
          friend || undefined,
          car.bringsCar,
          car.bringsCar ? clampSeats(car.seats) : undefined,
          car.pickupLat ?? undefined,
          car.pickupLng ?? undefined,
          agreedToTerms,
          car.trip,
        ))
        router.refresh()
      } catch (err) {
        setError(isNetworkError(err) ? networkError : dict.joinError)
        // The registration may have been saved before the connection dropped — show the real state.
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
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={bringingFriend}
            onChange={e => { setBringingFriend(e.target.checked); if (!e.target.checked) setFriendName('') }}
            className="w-4 h-4 accent-emerald-600 shrink-0"
          />
          <span className="flex items-center gap-1.5 text-sm font-medium text-stone-600">
            <UserPlus size={15} className="text-emerald-600" />
            {dict.bringFriend}
          </span>
        </label>

        {bringingFriend && (
          <input
            type="text"
            value={friendName}
            onChange={e => setFriendName(e.target.value)}
            placeholder={dict.friendNamePlaceholder}
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            autoFocus
          />
        )}

        <CarPreferenceFields
          value={car}
          onChange={updateCar}
          onPickLocation={() => setShowLocationModal(true)}
          dict={dict}
          tripDict={tripDict}
        />

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={e => setAgreedToTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
          />
          <span className="text-sm text-stone-600">
            {dict.agreeToTermsLabel}{' '}
            <Link
              href={`/${lang}/terms`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-emerald-700 font-medium underline hover:text-emerald-800"
            >
              {dict.termsLinkText}
            </Link>
          </span>
        </label>

        <button
          onClick={handleJoin}
          disabled={isPending || (bringingFriend && !friend) || !agreedToTerms}
          className={`w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-60 ${
            isFull ? 'bg-stone-700 text-white hover:bg-stone-800' : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isPending ? dict.registering : isFull ? dict.joinWaitlist : dict.registerNow}
        </button>
        {error && <p className="text-red-600 text-sm mt-1 text-center">{error}</p>}
      </div>
    </>
  )
}
