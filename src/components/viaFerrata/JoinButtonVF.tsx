'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { joinViaFerrata, cancelViaFerrataRegistration } from '@/app/actions/viaFerrata'
import { X, UserPlus, Timer } from 'lucide-react'

type StatusEntry = { label: string; desc: string }
type JoinButtonVFDict = {
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
  agreeToTermsLabel: string
  termsLinkText: string
  payWithin: string
  paymentWindowExpired: string
  waitlistPosition: string
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

function PaymentCountdown({ deadline, dict }: { deadline: string; dict: JoinButtonVFDict }) {
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

export default function JoinButtonVF({
  viaFerrataId,
  userId,
  isFull,
  participationStatus,
  paymentDeadline = null,
  waitlistPosition = null,
  waitlistCount = 0,
  dict,
  lang,
}: {
  viaFerrataId: string
  userId: string | null
  isFull: boolean
  participationStatus: 'pending' | 'confirmed' | 'rejected' | 'waitlist' | 'expired' | null
  paymentDeadline?: string | null
  waitlistPosition?: number | null
  waitlistCount?: number
  dict: JoinButtonVFDict
  lang: string
}) {
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [isPending, startTransition] = useTransition()

  const [bringingFriend, setBringingFriend] = useState(false)
  const [friendName, setFriendName] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const router = useRouter()

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
        await cancelViaFerrataRegistration(viaFerrataId)
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
        await joinViaFerrata(
          viaFerrataId,
          bringingFriend && friendName.trim() ? friendName.trim() : undefined,
          agreedToTerms,
        )
        router.refresh()
      } catch {
        setError(dict.joinError)
      }
    })
  }

  return (
    <>
      {participationStatus ? (
        /* ── Already registered ── */
        <div className="space-y-3">
          <div className={`border rounded-xl p-4 text-center ${STATUS_COLORS[participationStatus]}`}>
            <div className="font-bold">{dict.status[participationStatus].label}</div>
            <p className="text-sm mt-1 opacity-80">{dict.status[participationStatus].desc}</p>
            {participationStatus === 'waitlist' && waitlistPosition && (
              <p className="text-sm mt-1 font-semibold">
                {dict.waitlistPosition
                  .replace('{position}', String(waitlistPosition))
                  .replace('{count}', String(waitlistCount))}
              </p>
            )}
            {participationStatus === 'pending' && paymentDeadline && (
              <PaymentCountdown deadline={paymentDeadline} dict={dict} />
            )}
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
            disabled={isPending || (bringingFriend && !friendName.trim()) || !agreedToTerms}
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
