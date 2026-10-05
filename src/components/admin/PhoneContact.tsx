'use client'

import { useState } from 'react'
import { Copy, Check, MessageCircle } from 'lucide-react'
import { toInternationalDigits, whatsAppUrl } from '@/lib/phone'

export default function PhoneContact({
  phone,
  dict,
}: {
  phone: string
  dict: { copyPhone: string; phoneCopied: string; openWhatsApp: string }
}) {
  const [copied, setCopied] = useState(false)
  const digits = toInternationalDigits(phone)
  const url = whatsAppUrl(phone)

  async function copy() {
    try {
      await navigator.clipboard.writeText(digits ? `+${digits}` : phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable (e.g. non-HTTPS) — nothing to do
    }
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" title={dict.openWhatsApp}
          className="inline-flex items-center gap-1 text-emerald-600 hover:underline">
          <MessageCircle size={12} /> {phone}
        </a>
      ) : (
        <span className="text-stone-500">{phone}</span>
      )}
      <button type="button" onClick={copy} title={copied ? dict.phoneCopied : dict.copyPhone}
        aria-label={dict.copyPhone}
        className="p-0.5 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100">
        {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
      </button>
    </div>
  )
}
