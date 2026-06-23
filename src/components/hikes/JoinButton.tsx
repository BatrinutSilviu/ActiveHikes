'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { joinHike, cancelRegistration } from '@/app/actions/hikes'
import { X, UserPlus, Car } from 'lucide-react'

type StatusEntry = { label: string; desc: string }
type JoinButtonDict = {
  loginToJoin: string
  registerNow: string
  joinWaitlist: string
  registering: string
  cancelRegistration: string
  cancelling: string
  cancelConfirm: string
  cancelError: string
  joinError: string
  bringFriend: string
  friendNamePlaceholder: string
  bringingCar: string
  carSeatsLabel: string
  status: {
    pending: StatusEntry
    confirmed: StatusEntry
    rejected: StatusEntry
    waitlist: StatusEntry
  }
}

const STATUS_COLORS = {
  pending: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  confirmed: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  rejected: 'bg-red-50 border-red-200 text-red-800',
  waitlist: 'bg-blue-50 border-blue-200 text-blue-800',
}

export default function JoinButton({
  hikeId,
  userId,
  isFull,
  participationStatus,
  dict,
  lang,
}: {
  hikeId: string
  userId: string | null
  isFull: boolean
  participationStatus: 'pending' | 'confirmed' | 'rejected' | 'waitlist' | null
  dict: JoinButtonDict
  lang: string
}) {
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [bringingFriend, setBringingFriend] = useState(false)
  const [friendName, setFriendName] = useState('')
  const [bringingCar, setBringingCar] = useState(false)
  const [carSeats, setCarSeats] = useState(4)
  const router = useRouter()

  if (!userId) {
    return (
      <Link href={`/${lang}/auth/login`} className="block w-full text-center bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
        {dict.loginToJoin}
      </Link>
    )
  }

  const handleCancel = () => {
    if (!confirm(dict.cancelConfirm)) return
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

  if (participationStatus) {
    const ui = dict.status[participationStatus]
    const canCancel = participationStatus === 'pending' || participationStatus === 'waitlist'
    return (
      <div>
        <div className={`border rounded-xl p-4 text-center ${STATUS_COLORS[participationStatus]}`}>
          <div className="font-bold">{ui.label}</div>
          <p className="text-sm mt-1 opacity-80">{ui.desc}</p>
        </div>
        {canCancel && (
          <button onClick={handleCancel} disabled={cancelling}
            className="w-full mt-3 flex items-center justify-center gap-2 border-2 border-red-200 text-red-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-50 hover:border-red-400 active:bg-red-100 transition-colors disabled:opacity-50">
            <X size={15} strokeWidth={2.5} />
            {cancelling ? dict.cancelling : dict.cancelRegistration}
          </button>
        )}
        {cancelError && <p className="text-red-600 text-xs text-center mt-1">{cancelError}</p>}
      </div>
    )
  }

  const handleJoin = () => {
    setError('')
    startTransition(async () => {
      try {
        await joinHike(hikeId, bringingFriend && friendName.trim() ? friendName.trim() : undefined, bringingCar, bringingCar ? carSeats : undefined)
        router.refresh()
      } catch {
        setError(dict.joinError)
      }
    })
  }

  return (
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
        <div className="flex items-center gap-3 pl-6">
          <label className="text-sm text-stone-500 shrink-0">{dict.carSeatsLabel}</label>
          <input
            type="number"
            value={carSeats}
            onChange={e => setCarSeats(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
            min={1}
            max={8}
            className="w-20 border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

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
  )
}
