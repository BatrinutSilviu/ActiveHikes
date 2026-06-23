'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Mountain } from 'lucide-react'
import { useDict } from '@/hooks/useDict'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const params = useParams()
  const lang = (params?.lang as string) ?? 'ro'
  const d = useDict().auth.signup

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong.')
      setLoading(false)
      return
    }
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) router.push(`/${lang}/auth/login`)
    else { router.push(`/${lang}`); router.refresh() }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3"><Mountain size={36} className="text-emerald-600" /></div>
          <h1 className="text-3xl font-bold text-stone-900">{d.title}</h1>
          <p className="text-stone-500 mt-1">{d.subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
          <button onClick={() => signIn('google', { callbackUrl: `/${lang}` })}
            className="w-full flex items-center justify-center gap-3 border border-stone-200 rounded-xl py-3 px-4 hover:bg-stone-50 transition-colors font-medium text-stone-700 mb-6">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            {d.continueWithGoogle}
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
            <div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-stone-400">{d.orWithEmail}</span></div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {d.fullName} <span className="text-red-500">*</span>
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={d.fullNamePlaceholder} />
              <p className="text-xs text-stone-400 mt-1">{d.fullNameNote}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{d.phone}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={d.phonePlaceholder} />
              <p className="text-xs text-stone-400 mt-1">{d.phoneNote}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{d.email}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{d.password}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={d.passwordNote} />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {loading ? d.creating : d.createAccount}
            </button>
          </form>

          <p className="text-center text-stone-500 text-sm mt-6">
            {d.alreadyAccount}{' '}
            <Link href={`/${lang}/auth/login`} className="text-emerald-600 font-medium hover:underline">{d.signIn}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
