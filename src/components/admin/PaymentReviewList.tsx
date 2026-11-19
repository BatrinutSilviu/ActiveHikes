'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignBankTransaction, dismissBankTransaction } from '@/app/actions/bankConnection'
import { Check, X } from 'lucide-react'

export type PaymentReviewCandidate = {
  participantId: string
  name: string
  hikeTitle: string
  hikeDate: string
  status: 'pending' | 'waitlist'
  expectedAmount: number
  withFriend: boolean
  amountMatches: boolean
  nameMatches: boolean
  namePartlyMatches: boolean
}

export type PaymentReviewItem = {
  id: string
  amount: number
  description: string
  senderName: string | null
  bookedAt: string | null
  candidates: PaymentReviewCandidate[]
}

export type PaymentReviewOption = { participantId: string; label: string }

type Dict = {
  title: string
  hint: string
  from: string
  note: string
  noNote: string
  received: string
  suggestions: string
  noSuggestions: string
  amountMatches: string
  nameMatches: string
  namePartlyMatches: string
  owes: string
  withFriend: string
  statusPending: string
  statusWaitlist: string
  confirm: string
  someoneElse: string
  dismiss: string
  error: string
}

export default function PaymentReviewList({ reviews, options, dict, locale }: {
  reviews: PaymentReviewItem[]
  options: PaymentReviewOption[]
  dict: Dict
  locale: string
}) {
  if (reviews.length === 0) return null
  const dateLocale = locale === 'en' ? 'en-GB' : 'ro-RO'

  return (
    <div className="bg-white border border-amber-200 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="font-bold text-stone-800 text-lg">{dict.title} ({reviews.length})</h2>
        <p className="text-stone-500 text-sm mt-1">{dict.hint}</p>
      </div>
      {reviews.map(review => (
        <ReviewCard key={review.id} review={review} options={options} dict={dict} dateLocale={dateLocale} />
      ))}
    </div>
  )
}

function ReviewCard({ review, options, dict, dateLocale }: {
  review: PaymentReviewItem
  options: PaymentReviewOption[]
  dict: Dict
  dateLocale: string
}) {
  const router = useRouter()
  const [otherId, setOtherId] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const run = (action: () => Promise<void>) => {
    setError('')
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch {
        setError(dict.error)
      }
    })
  }

  const statusLabel = { pending: dict.statusPending, waitlist: dict.statusWaitlist }

  return (
    <div className="border border-stone-100 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xl font-black text-stone-900">{review.amount.toFixed(2)} RON</span>
        {review.bookedAt && (
          <span className="text-xs text-stone-400">
            {dict.received}: {new Date(review.bookedAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>
      <div className="text-sm text-stone-600 space-y-0.5">
        {review.senderName && <div><span className="text-stone-400">{dict.from}:</span> {review.senderName}</div>}
        <div>
          <span className="text-stone-400">{dict.note}:</span>{' '}
          {review.description ? <span className="font-medium">&ldquo;{review.description}&rdquo;</span> : <span className="italic text-stone-400">{dict.noNote}</span>}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">{dict.suggestions}</p>
        {review.candidates.length === 0 ? (
          <p className="text-sm text-stone-400">{dict.noSuggestions}</p>
        ) : (
          <div className="space-y-2">
            {review.candidates.map(c => (
              <div key={c.participantId} className="flex flex-wrap items-center gap-2 bg-stone-50 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-stone-800">
                    {c.name}{c.withFriend && <span className="font-normal text-stone-500"> {dict.withFriend}</span>}
                  </div>
                  <div className="text-xs text-stone-500">
                    {c.hikeTitle} · {new Date(c.hikeDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })} · {dict.owes} {c.expectedAmount.toFixed(2)} RON · {statusLabel[c.status]}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.amountMatches && <span className="text-[11px] font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{dict.amountMatches}</span>}
                    {c.nameMatches
                      ? <span className="text-[11px] font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{dict.nameMatches}</span>
                      : c.namePartlyMatches && <span className="text-[11px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{dict.namePartlyMatches}</span>}
                  </div>
                </div>
                <button type="button" disabled={isPending} onClick={() => run(() => assignBankTransaction(review.id, c.participantId))}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60">
                  <Check size={14} /> {dict.confirm}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select value={otherId} onChange={e => setOtherId(e.target.value)} disabled={isPending}
          className="flex-1 min-w-0 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">{dict.someoneElse}</option>
          {options.map(o => <option key={o.participantId} value={o.participantId}>{o.label}</option>)}
        </select>
        <button type="button" disabled={!otherId || isPending} onClick={() => run(() => assignBankTransaction(review.id, otherId))}
          className="flex items-center justify-center gap-1.5 bg-stone-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-900 disabled:opacity-60">
          <Check size={14} /> {dict.confirm}
        </button>
        <button type="button" disabled={isPending} onClick={() => run(() => dismissBankTransaction(review.id))}
          className="flex items-center justify-center gap-1.5 border border-stone-200 text-stone-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-50 disabled:opacity-60">
          <X size={14} /> {dict.dismiss}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
