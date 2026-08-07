'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useDict } from '@/hooks/useDict'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const params = useParams()
  const lang = (params?.lang as string) ?? 'ro'
  const d = useDict().auth.forgotPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, lang }),
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
      <div className="w-full max-w-sm relative">

        <div className="text-center mb-8">
          <Link href={`/${lang}`} className="inline-flex items-center justify-center mb-6">
            <img src="/logo.png" alt="Active Hikes" className="h-10 w-auto" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white">{d.title}</h1>
          <p className="text-stone-400 text-sm mt-1.5">{d.subtitle}</p>
        </div>

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
      </div>
    </div>
  )
}
