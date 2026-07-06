'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'
import { updateProfileName } from '@/app/actions/profile'

export default function NameEditor({
  fullName,
  labels,
}: {
  fullName: string
  labels: {
    firstName: string
    lastName: string
    edit: string
    save: string
    cancel: string
    error: string
  }
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [initialFirst, ...rest] = fullName.trim().split(/\s+/)
  const [firstName, setFirstName] = useState(initialFirst ?? '')
  const [lastName, setLastName] = useState(rest.join(' '))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await updateProfileName(firstName, lastName)
      setEditing(false)
      router.refresh()
    } catch {
      setError(labels.error)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-black tracking-tight text-white">{fullName}</h1>
        <button
          onClick={() => setEditing(true)}
          aria-label={labels.edit}
          title={labels.edit}
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 border border-white/15 text-stone-200 hover:bg-emerald-500/20 hover:border-emerald-400/40 hover:text-emerald-300 transition-colors shrink-0"
        >
          <Pencil size={13} />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          placeholder={labels.firstName}
          required
          autoFocus
          className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-32"
        />
        <input
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          placeholder={labels.lastName}
          required
          className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-32"
        />
        <button
          type="submit"
          disabled={saving}
          aria-label={labels.save}
          className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50 p-1.5 bg-emerald-500/10 rounded-lg"
        >
          <Check size={15} />
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError(''); setFirstName(initialFirst ?? ''); setLastName(rest.join(' ')) }}
          aria-label={labels.cancel}
          className="text-stone-400 hover:text-stone-300 p-1.5 bg-stone-800 rounded-lg"
        >
          <X size={15} />
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  )
}
