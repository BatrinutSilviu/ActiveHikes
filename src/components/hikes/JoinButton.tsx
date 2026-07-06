'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { joinHike, cancelRegistration, updateCarPreference } from '@/app/actions/hikes'
import { X, UserPlus, Car, MapPin, Pencil, Timer } from 'lucide-react'
import LocationPickerModal from './LocationPickerModalWrapper'

type StatusEntry = { label: string; desc: string }
type JoinButtonDict = {
  loginToJoin: string
  registerNow: string
  joinWaitlist: string
  registering: string
  cancelRegistration: string
  registerAgain: string
  cancelling: string
  cancelConfirm: string
  cancelError: string
  joinError: string
  bringFriend: string
  friendNamePlaceholder: string
  bringingCar: string
  carSeatsLabel: string
  saveCarPreference: string
  savingCarPreference: string
  carSaveError: string
  setPickupLocation: string
  setDeparturePoint: string
  locationSet: string
  changeLocation: string
  locationModalHint: string
  locationPassengerTitle: string
  locationDriverTitle: string
  locationConfirm: string
  locationCancel: string
  payWithin: string
  paymentWindowExpired: string
  status: {
    pending: StatusEntry
    confirmed: StatusEntry
    rejected: StatusEntry
    waitlist: StatusEntry
    expired: StatusEntry
  }
}

const STATUS_COLORS = {
  pending: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  confirmed: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  rejected: 'bg-red-50 border-red-200 text-red-800',
  waitlist: 'bg-blue-50 border-blue-200 text-blue-800',
  expired: 'bg-stone-100 border-stone-300 text-stone-600',
}

function PaymentCountdown({ deadline, dict }: { deadline: string; dict: JoinButtonDict }) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(deadline).getTime() - Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(new Date(deadline).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  if (remainingMs <= 0) return <p className="text-sm mt-2 font-semibold">{dict.paymentWindowExpired}</p>

  const totalSeconds = Math.floor(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const urgent = remainingMs < 15 * 60 * 1000

  return (
    <p className={`text-sm mt-2 font-semibold flex items-center justify-center gap-1.5 ${urgent ? 'text-red-600' : ''}`}>
      <Timer size={14} />
      {dict.payWithin} {hours}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s
    </p>
  )
}

function LocationButton({
  lat,
  lng,
  isDriver,
  dict,
  onOpen,
}: {
  lat: number | null
  lng: number | null
  isDriver: boolean
  dict: JoinButtonDict
  onOpen: () => void
}) {
  if (lat != null) {
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

export default function JoinButton({
  hikeId,
  userId,
  isFull,
  participationStatus,
  currentBringsCar = false,
  currentCarSeats = null,
  currentPickupLat = null,
  currentPickupLng = null,
  paymentDeadline = null,
  dict,
  lang,
}: {
  hikeId: string
  userId: string | null
  isFull: boolean
  participationStatus: 'pending' | 'confirmed' | 'rejected' | 'waitlist' | 'expired' | null
  currentBringsCar?: boolean
  currentCarSeats?: number | null
  currentPickupLat?: number | null
  currentPickupLng?: number | null
  paymentDeadline?: string | null
  dict: JoinButtonDict
  lang: string
}) {
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Registration form state
  const [bringingFriend, setBringingFriend] = useState(false)
  const [friendName, setFriendName] = useState('')
  const [bringingCar, setBringingCar] = useState(false)
  const [carSeats, setCarSeats] = useState(4)
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)

  // Edit form state (already registered)
  const [editBringsCar, setEditBringsCar] = useState(currentBringsCar)
  const [editCarSeats, setEditCarSeats] = useState(currentCarSeats ?? 4)
  const [editPickupLat, setEditPickupLat] = useState<number | null>(currentPickupLat ?? null)
  const [editPickupLng, setEditPickupLng] = useState<number | null>(currentPickupLng ?? null)
  const [carSaveError, setCarSaveError] = useState('')
  const [isSavingCar, startCarTransition] = useTransition()

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalForEdit, setModalForEdit] = useState(false)

  const router = useRouter()

  const carChanged =
    editBringsCar !== currentBringsCar ||
    (editBringsCar && editCarSeats !== (currentCarSeats ?? 4)) ||
    editPickupLat !== (currentPickupLat ?? null) ||
    editPickupLng !== (currentPickupLng ?? null)

  const openModal = (forEdit: boolean) => {
    setModalForEdit(forEdit)
    setShowModal(true)
  }

  const handleModalConfirm = (lat: number, lng: number) => {
    if (modalForEdit) {
      setEditPickupLat(lat)
      setEditPickupLng(lng)
    } else {
      setPickupLat(lat)
      setPickupLng(lng)
    }
    setShowModal(false)
  }

  const modalInitialLat = modalForEdit ? editPickupLat : pickupLat
  const modalInitialLng = modalForEdit ? editPickupLng : pickupLng
  const modalIsDriver = modalForEdit ? editBringsCar : bringingCar

  const handleSaveCar = () => {
    setCarSaveError('')
    startCarTransition(async () => {
      try {
        await updateCarPreference(
          hikeId,
          editBringsCar,
          editBringsCar ? editCarSeats : undefined,
          editPickupLat,
          editPickupLng,
        )
        router.refresh()
      } catch {
        setCarSaveError(dict.carSaveError)
      }
    })
  }

  if (!userId) {
    return (
      <Link href={`/${lang}/auth/login`} className="block w-full text-center bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
        {dict.loginToJoin}
      </Link>
    )
  }

  const handleCancel = () => {
    if (participationStatus !== 'expired' && !confirm(dict.cancelConfirm)) return
    setCancelling(true)
    setCancelError('')
    startTransition(async () => {
      try {
        await cancelRegistration(hikeId)
        router.refresh()
      } catch {
        setCancelError(dict.cancelError)
        setCancelling(false)
      }
    })
  }

  const handleJoin = () => {
    setError('')
    startTransition(async () => {
      try {
        await joinHike(
          hikeId,
          bringingFriend && friendName.trim() ? friendName.trim() : undefined,
          bringingCar,
          bringingCar ? carSeats : undefined,
          pickupLat ?? undefined,
          pickupLng ?? undefined,
        )
        router.refresh()
      } catch {
        setError(dict.joinError)
      }
    })
  }

  return (
    <>
      {showModal && (
        <LocationPickerModal
          initialLat={modalInitialLat}
          initialLng={modalInitialLng}
          title={modalIsDriver ? dict.locationDriverTitle : dict.locationPassengerTitle}
          hint={dict.locationModalHint}
          confirmLabel={dict.locationConfirm}
          cancelLabel={dict.locationCancel}
          onConfirm={handleModalConfirm}
          onClose={() => setShowModal(false)}
        />
      )}

      {participationStatus ? (
        /* ── Already registered ── */
        <div className="space-y-3">
          <div className={`border rounded-xl p-4 text-center ${STATUS_COLORS[participationStatus]}`}>
            <div className="font-bold">{dict.status[participationStatus].label}</div>
            <p className="text-sm mt-1 opacity-80">{dict.status[participationStatus].desc}</p>
            {participationStatus === 'pending' && paymentDeadline && (
              <PaymentCountdown deadline={paymentDeadline} dict={dict} />
            )}
          </div>

          <div className="border border-stone-200 rounded-xl p-3 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editBringsCar}
                onChange={e => setEditBringsCar(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 shrink-0"
              />
              <span className="flex items-center gap-1.5 text-sm font-medium text-stone-600">
                <Car size={15} className="text-emerald-600" />
                {dict.bringingCar}
              </span>
            </label>

            {editBringsCar && (
              <div className="pl-6 space-y-1">
                <label className="block text-sm text-stone-500">{dict.carSeatsLabel}</label>
                <input
                  type="number"
                  value={editCarSeats}
                  onChange={e => setEditCarSeats(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={8}
                  className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <LocationButton
              lat={editPickupLat}
              lng={editPickupLng}
              isDriver={editBringsCar}
              dict={dict}
              onOpen={() => openModal(true)}
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

          {(participationStatus === 'pending' || participationStatus === 'waitlist' || participationStatus === 'expired') && (
            <button onClick={handleCancel} disabled={cancelling}
              className="w-full flex items-center justify-center gap-2 border-2 border-red-200 text-red-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-50 hover:border-red-400 active:bg-red-100 transition-colors disabled:opacity-50">
              <X size={15} strokeWidth={2.5} />
              {cancelling ? dict.cancelling : (participationStatus === 'expired' ? dict.registerAgain : dict.cancelRegistration)}
            </button>
          )}
          {cancelError && <p className="text-red-600 text-xs text-center mt-1">{cancelError}</p>}
        </div>
      ) : (
        /* ── Registration form ── */
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

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bringingCar}
              onChange={e => setBringingCar(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 shrink-0"
            />
            <span className="flex items-center gap-1.5 text-sm font-medium text-stone-600">
              <Car size={15} className="text-emerald-600" />
              {dict.bringingCar}
            </span>
          </label>

          {bringingCar && (
            <div className="pl-6 space-y-1">
              <label className="block text-sm text-stone-500">{dict.carSeatsLabel}</label>
              <input
                type="number"
                value={carSeats}
                onChange={e => setCarSeats(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                min={1}
                max={8}
                className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <LocationButton
            lat={pickupLat}
            lng={pickupLng}
            isDriver={bringingCar}
            dict={dict}
            onOpen={() => openModal(false)}
          />

          <button
            onClick={handleJoin}
            disabled={isPending || (bringingFriend && !friendName.trim())}
            className={`w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-60 ${
              isFull ? 'bg-stone-700 text-white hover:bg-stone-800' : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isPending ? dict.registering : isFull ? dict.joinWaitlist : dict.registerNow}
          </button>
          {error && <p className="text-red-600 text-sm mt-1 text-center">{error}</p>}
        </div>
      )}
    </>
  )
}
