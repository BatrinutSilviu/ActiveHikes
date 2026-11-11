'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Which payment methods an event's page shows: a dropdown with a checkbox per method
// (managed under Payment Methods). Used when creating an event and on its edit page.

export type PaymentMethodOption = {
  id: string
  type: string
  bankName: string | null
  accountHolder: string
  iban?: string | null
  paymentHandle?: string | null
}

export function methodLabel(account: PaymentMethodOption): string {
  const method = account.type === 'revolut' ? 'Revolut' : account.type === 'btpay' ? 'BT Pay' : account.bankName || 'Bank'
  return `${method} — ${account.accountHolder}`
}

export default function PaymentMethodsDropdown({ accounts, selected, onChange, label, hint, empty }: {
  accounts: PaymentMethodOption[]
  selected: string[]
  onChange: (ids: string[]) => void
  label: string
  hint: string
  empty: string // shown when there are no methods at all
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // Close when tapping outside.
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const chosen = accounts.filter(a => selected.includes(a.id))
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  return (
    <div ref={ref}>
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      <p className="text-xs text-stone-400 mb-2">{hint}</p>
      {accounts.length === 0 ? (
        <p className="text-sm text-stone-400">{empty}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="w-full flex items-center justify-between gap-2 border border-stone-200 rounded-xl px-4 py-3 bg-white text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <span className={`truncate ${chosen.length === 0 ? 'text-stone-400' : 'text-stone-700'}`}>
              {chosen.length === 0 ? '—' : chosen.map(methodLabel).join(', ')}
            </span>
            <ChevronDown size={16} className={`text-stone-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {/* Opens in place, so the rest of the form never covers it. */}
          {open && (
            <div role="listbox" aria-multiselectable className="mt-1 bg-white border border-stone-200 rounded-xl shadow-sm py-1">
              {accounts.map(account => (
                <label key={account.id} className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-stone-50">
                  <input type="checkbox" checked={selected.includes(account.id)} onChange={() => toggle(account.id)} className="w-4 h-4 accent-emerald-600 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm text-stone-700 truncate">{methodLabel(account)}</span>
                    {(account.paymentHandle || account.iban) && (
                      <span className="block text-xs text-stone-400 font-mono truncate">{account.paymentHandle || account.iban}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
