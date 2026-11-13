'use client'

import { Car, User, MapPin, Pencil } from 'lucide-react'
import LocationPickerModal from '@/components/hikes/LocationPickerModalWrapper'
import { type CarTrip, CAR_TRIPS } from '@/lib/carTrip'
import type { CarTripDict, JoinButtonDict } from './types'

/** Car-sharing choices, edited both when registering and afterwards. Seats are kept as typed text. */
export type CarPreference = {
  bringsCar: boolean
  seats: string
  trip: CarTrip
  pickupLat: number | null
  pickupLng: number | null
}

const DEFAULT_SEATS = 4

/** Seats a driver offers, limited to 1–8; anything unreadable falls back to 4. */
export function clampSeats(raw: string): number {
  const n = parseInt(raw, 10)
  return Math.max(1, Math.min(8, Number.isFinite(n) ? n : DEFAULT_SEATS))
}

export function initialCarPreference(registration?: {
  bringsCar: boolean
  carSeats: number | null
  carTrip: CarTrip
  pickupLat: number | null
  pickupLng: number | null
} | null): CarPreference {
  return {
    bringsCar: registration?.bringsCar ?? false,
    seats: String(registration?.carSeats ?? DEFAULT_SEATS),
    trip: registration?.carTrip ?? 'both',
    pickupLat: registration?.pickupLat ?? null,
    pickupLng: registration?.pickupLng ?? null,
  }
}

/**
 * Driver/passenger toggle, trip direction, seat count (drivers only) and the
 * pickup/departure point. Rendered without a wrapper so each form controls the spacing.
 */
export function CarPreferenceFields({
  value,
  onChange,
  onPickLocation,
  dict,
  tripDict,
}: {
  value: CarPreference
  onChange: (patch: Partial<CarPreference>) => void
  onPickLocation: () => void
  dict: JoinButtonDict
  tripDict: CarTripDict
}) {
  return (
    <>
      <CarToggle value={value.bringsCar} onChange={bringsCar => onChange({ bringsCar })} dict={dict} />

      <TripToggle value={value.trip} onChange={trip => onChange({ trip })} dict={tripDict} />

      {value.bringsCar && (
        <div className="pl-6 space-y-1">
          <label className="block text-sm text-stone-500">{dict.carSeatsLabel}</label>
          <input
            type="number"
            inputMode="numeric"
            value={value.seats}
            onChange={e => onChange({ seats: e.target.value })}
            onBlur={() => onChange({ seats: String(clampSeats(value.seats)) })}
            min={1}
            max={8}
            className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

      <LocationButton
        hasLocation={value.pickupLat != null}
        isDriver={value.bringsCar}
        dict={dict}
        onOpen={onPickLocation}
      />
    </>
  )
}

/** Map dialog for the pickup point (passengers) or departure point (drivers). */
export function PickupLocationModal({
  value,
  dict,
  onConfirm,
  onClose,
}: {
  value: CarPreference
  dict: JoinButtonDict
  onConfirm: (lat: number, lng: number) => void
  onClose: () => void
}) {
  return (
    <LocationPickerModal
      initialLat={value.pickupLat}
      initialLng={value.pickupLng}
      title={value.bringsCar ? dict.locationDriverTitle : dict.locationPassengerTitle}
      hint={dict.locationModalHint}
      confirmLabel={dict.locationConfirm}
      cancelLabel={dict.locationCancel}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}

const SEGMENT_ACTIVE = 'bg-white text-emerald-700 shadow-sm'
const SEGMENT_INACTIVE = 'text-stone-500 hover:text-stone-700'

function CarToggle({
  value,
  onChange,
  dict,
}: {
  value: boolean
  onChange: (value: boolean) => void
  dict: JoinButtonDict
}) {
  return (
    <div>
      <span className="flex items-center gap-1.5 text-sm font-medium text-stone-600 mb-1.5">
        <Car size={15} className="text-emerald-600" />
        {dict.carToggleLabel}
      </span>
      <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl" role="group">
        <button
          type="button"
          onClick={() => onChange(true)}
          aria-pressed={value}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            value ? SEGMENT_ACTIVE : SEGMENT_INACTIVE
          }`}
        >
          <Car size={14} className="shrink-0" />
          {dict.carOptionDriver}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          aria-pressed={!value}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            !value ? SEGMENT_ACTIVE : SEGMENT_INACTIVE
          }`}
        >
          <User size={14} className="shrink-0" />
          {dict.carOptionPassenger}
        </button>
      </div>
    </div>
  )
}

function TripToggle({
  value,
  onChange,
  dict,
}: {
  value: CarTrip
  onChange: (value: CarTrip) => void
  dict: CarTripDict
}) {
  return (
    <div>
      <span className="block text-sm text-stone-500 mb-1.5">{dict.label}</span>
      <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 rounded-xl" role="group">
        {CAR_TRIPS.map(trip => (
          <button
            key={trip}
            type="button"
            onClick={() => onChange(trip)}
            aria-pressed={value === trip}
            className={`py-2 px-1 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              value === trip ? SEGMENT_ACTIVE : SEGMENT_INACTIVE
            }`}
          >
            {dict[trip]}
          </button>
        ))}
      </div>
    </div>
  )
}

function LocationButton({
  hasLocation,
  isDriver,
  dict,
  onOpen,
}: {
  hasLocation: boolean
  isDriver: boolean
  dict: JoinButtonDict
  onOpen: () => void
}) {
  if (hasLocation) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-3 rounded-xl hover:bg-emerald-100 active:bg-emerald-200 transition-colors w-full"
      >
        <MapPin size={14} className="shrink-0" />
        <span className="flex-1 text-left font-medium">{dict.locationSet}</span>
        <span className="flex items-center gap-1 text-xs text-emerald-600 shrink-0">
          <Pencil size={11} /> {dict.changeLocation}
        </span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-2 text-sm text-stone-600 border border-dashed border-stone-300 px-3 py-3 rounded-xl hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-50 transition-colors w-full"
    >
      <MapPin size={14} className="shrink-0 text-stone-400" />
      <span>{isDriver ? dict.setDeparturePoint : dict.setPickupLocation}</span>
    </button>
  )
}
