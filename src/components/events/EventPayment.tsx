// The price header of the registration panel and the "how to pay" box, shared by
// the hike and Via Ferrata detail pages.
import { DollarSign, ExternalLink } from 'lucide-react'
import type { BankAccount } from '@prisma/client'
import { formatRon, priceOrFree } from '@/lib/money'

/**
 * Prices at the top of the registration panel. When the full price is higher than what
 * confirms a spot (e.g. accommodation paid later), both are shown side by side.
 * Amounts are per person; `priceMultiplier` doubles them for someone bringing a friend.
 */
export function PriceSummary({
  totalPrice,
  confirmationPrice,
  priceMultiplier,
  hasFriend,
  breakdown,
  dict,
  children,
}: {
  totalPrice: number
  confirmationPrice: number
  priceMultiplier: number
  hasFriend: boolean
  /** Small print right under the price, e.g. how the amount splits into fee and deposit. */
  breakdown?: string | null
  dict: {
    totalPriceLabel: string
    confirmationPriceLabel: string
    free: string
    forYouAndFriend: string
    perPerson: string
    friendDoublesFee: string
  }
  children?: React.ReactNode
}) {
  const displayConfirmationPrice = confirmationPrice * priceMultiplier
  const displayTotalPrice = totalPrice * priceMultiplier
  return (
    <div className="text-center mb-5">
      {totalPrice > confirmationPrice ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900">{formatRon(displayTotalPrice)}</div>
            <div className="text-stone-400 text-[11px] uppercase tracking-wide mt-1">{dict.totalPriceLabel}</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700">{formatRon(displayConfirmationPrice)}</div>
            <div className="text-stone-400 text-[11px] uppercase tracking-wide mt-1">{dict.confirmationPriceLabel}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="text-4xl font-black tracking-tight text-stone-900">
            {priceOrFree(displayConfirmationPrice, dict.free)}
          </div>
          {displayConfirmationPrice > 0 && (
            <p className="text-stone-400 text-sm mt-1">{hasFriend ? dict.forYouAndFriend : dict.perPerson}</p>
          )}
        </>
      )}
      {breakdown && (
        <p className="text-stone-400 text-xs mt-2 leading-relaxed">{breakdown}</p>
      )}
      {hasFriend && (
        <p className="text-emerald-600 text-xs font-medium mt-2 leading-relaxed">{dict.friendDoublesFee}</p>
      )}
      {children}
    </div>
  )
}

type PaymentAccount = Pick<BankAccount, 'id' | 'type' | 'bankName' | 'accountHolder' | 'iban' | 'paymentHandle' | 'notes'>

/** Where to send the money that confirms a registration (the event's active payment methods). */
export function PaymentInstructions({
  accounts,
  amount,
  hasFriend,
  note,
  dict,
}: {
  accounts: PaymentAccount[]
  /** What this user has to pay, friend included. */
  amount: number
  hasFriend: boolean
  /** Extra highlighted note, e.g. what the rest of the price covers. */
  note?: string | null
  dict: { paymentTitle: string; paymentDesc: string; friendDoublesFee: string; payWithRevolut: string }
}) {
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
      <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
        <DollarSign size={16} /> {dict.paymentTitle}
      </h3>
      <p className="text-amber-700 text-sm mb-4">
        {dict.paymentDesc.replace('{fee}', String(amount))}
      </p>
      {hasFriend && (
        <p className="text-amber-600 text-xs font-medium bg-amber-100/70 rounded-lg px-3 py-2 mb-4">
          {dict.friendDoublesFee}
        </p>
      )}
      {note && (
        <p className="text-amber-600 text-xs font-medium bg-amber-100/70 rounded-lg px-3 py-2 mb-4">
          {note}
        </p>
      )}
      {accounts.map(account => (
        <PaymentAccountCard key={account.id} account={account} payWithRevolutLabel={dict.payWithRevolut} />
      ))}
    </div>
  )
}

function PaymentAccountCard({ account, payWithRevolutLabel }: { account: PaymentAccount; payWithRevolutLabel: string }) {
  const methodLabel = account.type === 'revolut' ? 'Revolut' : account.type === 'btpay' ? 'BT Pay' : account.bankName
  // A Revolut handle like "@name" doubles as a revolut.me payment link.
  const revolutTag = account.type === 'revolut' && account.paymentHandle?.startsWith('@')
    ? account.paymentHandle.slice(1)
    : null
  return (
    <div className="bg-white rounded-xl p-4 mb-3 last:mb-0 border border-amber-100">
      <div className="font-semibold text-stone-800">{methodLabel}</div>
      <div className="text-stone-600 text-sm">{account.accountHolder}</div>
      <div className="font-mono text-sm mt-1 text-stone-700 break-all">
        {account.type === 'bank' ? account.iban : account.paymentHandle}
      </div>
      {revolutTag && (
        <a
          href={`https://revolut.me/${revolutTag}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2.5 bg-stone-900 hover:bg-stone-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          <ExternalLink size={12} /> {payWithRevolutLabel}
        </a>
      )}
      {account.notes && <p className="text-stone-400 text-xs mt-1">{account.notes}</p>}
    </div>
  )
}
