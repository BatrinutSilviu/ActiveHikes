'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useDict } from '@/hooks/useDict'
import { apiFetch } from '@/lib/net'
import AuthShell from '@/components/auth/AuthShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const params = useParams()
  const lang = (params?.lang as string) ?? 'ro'
  const dict = useDict()
  const d = dict.auth.forgotPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang }),
      })
      setSent(true)
    } catch {
      setError(dict.network.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell lang={lang} title={d.title} subtitle={d.subtitle}>
      <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/60 border border-stone-100 p-8">
        {sent ? (
          <p className="text-stone-600 text-sm text-center">{d.sentMessage}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">{d.email}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50 focus:bg-white transition-colors"
                placeholder="you@example.com" />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm mt-1">
              {loading ? d.sending : d.sendLink}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-stone-500 text-sm mt-6">
        <Link href={`/${lang}/auth/login`} className="text-emerald-400 font-semibold hover:underline">{d.backToLogin}</Link>
      </p>
    </AuthShell>
  )
}
