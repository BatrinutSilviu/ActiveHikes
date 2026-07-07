'use client'

import { useState, useTransition } from 'react'
import { createBankAccount, toggleBankAccount, deleteBankAccount } from '@/app/actions/bank-accounts'
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react'

type BankAccount = {
  id: string
  type: 'bank' | 'revolut'
  bankName: string | null
  accountHolder: string
  iban: string | null
  revolutHandle: string | null
  currency: string
  notes: string | null
  isActive: boolean
  createdAt: string
}

type BankAccountsDict = {
  title: string
  subtitle: string
  addAccount: string
  newBankAccount: string
  methodBank: string
  methodRevolut: string
  bankNamePlaceholder: string
  accountHolderPlaceholder: string
  ibanPlaceholder: string
  revolutHandlePlaceholder: string
  notesPlaceholder: string
  cancel: string
  save: string
  deleteConfirm: string
  visibleToUsers: string
  hidden: string
  noAccounts: string
}

export default function BankAccountsClient({
  initialAccounts,
  dict,
}: {
  initialAccounts: BankAccount[]
  dict: BankAccountsDict
}) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    type: 'bank' as 'bank' | 'revolut',
    bankName: '', accountHolder: '', iban: '', revolutHandle: '', currency: 'RON', notes: '',
  })
  const [, startTransition] = useTransition()

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      await createBankAccount(form)
      setAccounts(prev => [...prev, {
        id: Date.now().toString(),
        type: form.type,
        bankName: form.type === 'bank' ? form.bankName || null : null,
        accountHolder: form.accountHolder,
        iban: form.type === 'bank' ? form.iban || null : null,
        revolutHandle: form.type === 'revolut' ? form.revolutHandle || null : null,
        currency: form.currency,
        notes: form.notes || null,
        isActive: true, createdAt: new Date().toISOString(),
      }])
      setForm({ type: 'bank', bankName: '', accountHolder: '', iban: '', revolutHandle: '', currency: 'RON', notes: '' })
      setAdding(false)
    })
  }

  const handleToggle = (account: BankAccount) => {
    startTransition(async () => {
      await toggleBankAccount(account.id, !account.isActive)
      setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, isActive: !a.isActive } : a))
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm(dict.deleteConfirm)) return
    startTransition(async () => {
      await deleteBankAccount(id)
      setAccounts(prev => prev.filter(a => a.id !== id))
    })
  }

  const input = "w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{dict.title}</h1>
          <p className="text-stone-500 mt-1">{dict.subtitle}</p>
        </div>
        <button onClick={() => setAdding(!adding)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-emerald-700">
          <Plus size={16} /> {dict.addAccount}
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="bg-white border border-stone-100 rounded-2xl p-6 mb-6 space-y-3">
          <h2 className="font-bold text-stone-800 mb-2">{dict.newBankAccount}</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm(f => ({ ...f, type: 'bank' }))}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold border transition-colors ${form.type === 'bank' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
              {dict.methodBank}
            </button>
            <button type="button" onClick={() => setForm(f => ({ ...f, type: 'revolut' }))}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold border transition-colors ${form.type === 'revolut' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
              {dict.methodRevolut}
            </button>
          </div>
          {form.type === 'bank' ? (
            <>
              <input required placeholder={dict.bankNamePlaceholder} value={form.bankName}
                onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} className={input} />
              <input required placeholder={dict.accountHolderPlaceholder} value={form.accountHolder}
                onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))} className={input} />
              <input required placeholder={dict.ibanPlaceholder} value={form.iban}
                onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} className={input} />
            </>
          ) : (
            <>
              <input required placeholder={dict.accountHolderPlaceholder} value={form.accountHolder}
                onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))} className={input} />
              <input required placeholder={dict.revolutHandlePlaceholder} value={form.revolutHandle}
                onChange={e => setForm(f => ({ ...f, revolutHandle: e.target.value }))} className={input} />
            </>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={input}>
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
            </select>
            <input placeholder={dict.notesPlaceholder} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={input} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setAdding(false)}
              className="flex-1 border border-stone-200 rounded-xl py-2 text-stone-600 hover:bg-stone-50">{dict.cancel}</button>
            <button type="submit"
              className="flex-1 bg-emerald-600 text-white rounded-xl py-2 font-semibold hover:bg-emerald-700">{dict.save}</button>
          </div>
        </form>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-12 text-stone-400 bg-white rounded-2xl border border-stone-100">{dict.noAccounts}</div>
      ) : (
        <div className="space-y-3">
          {accounts.map(account => (
            <div key={account.id} className={`bg-white border rounded-2xl p-5 ${account.isActive ? 'border-stone-100' : 'border-stone-100 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-stone-800">{account.type === 'revolut' ? dict.methodRevolut : account.bankName}</div>
                  <div className="text-stone-600">{account.accountHolder}</div>
                  <div className="font-mono text-stone-700 text-sm mt-1">{account.type === 'revolut' ? account.revolutHandle : account.iban}</div>
                  <div className="text-stone-400 text-xs mt-0.5">{account.currency}{account.notes ? ` · ${account.notes}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(account)}
                    className="p-2 rounded-lg hover:bg-stone-100 text-stone-400">
                    {account.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => handleDelete(account.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${account.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                  {account.isActive ? dict.visibleToUsers : dict.hidden}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
