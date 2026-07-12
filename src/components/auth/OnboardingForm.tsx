'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { completeOnboarding } from '@/app/actions/profile'

type OnboardingDict = {
  fullName: string
  fullNameNote: string
  fullNamePlaceholder: string
  phone: string
  phoneNote: string
  phonePlaceholder: string
  save: string
  saving: string
  error: string
}

export default function OnboardingForm({
  initialName,
  callbackUrl,
  dict,
}: {
  initialName: string
  lang: string
  callbackUrl: string
  dict: OnboardingDict
}) {
  const router = useRouter()
  const { update } = useSession()
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await completeOnboarding(name, phone)
      await update()
      router.push(callbackUrl)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : dict.error)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
          {dict.fullName} <span className="text-red-500 normal-case">*</span>
        </label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50 focus:bg-white transition-colors"
          placeholder={dict.fullNamePlaceholder} />
        <p className="text-xs text-stone-400 mt-1.5">{dict.fullNameNote}</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
          {dict.phone} <span className="text-red-500 normal-case">*</span>
        </label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50 focus:bg-white transition-colors"
          placeholder={dict.phonePlaceholder} />
        <p className="text-xs text-stone-400 mt-1.5">{dict.phoneNote}</p>
      </div>
      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
      <button type="submit" disabled={saving}
        className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm mt-1">
        {saving ? dict.saving : dict.save}
      </button>
    </form>
  )
}
