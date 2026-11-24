'use client'

// Gas costs (admin, Cars page): the drivers' gas is split between everyone who went; passengers pay the share to the
// organiser and each driver gets back their cost minus the share. Saved on the hike (src/lib/gasCosts.ts).
import { useState, useTransition } from 'react'
import { Fuel, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { saveGasCosts } from '@/app/actions/gasCosts'
import { splitGas, type GasCosts } from '@/lib/gasCosts'

export type GasCostsDict = {
  title: string
  intro: string
  driver: string
  cost: string
  addDriver: string
  pickPerson: string
  someoneElse: string
  name: string
  add: string
  remove: string
  noDrivers: string
  people: string
  peopleHint: string
  total: string
  share: string
  passengersPay: string
  youCollect: string
  driversOwed: string
  youPay: string
  paysYou: string
  youGive: string
  balance: string
  tooFewPeople: string
  resetDrivers: string
  save: string
  saving: string
  saved: string
  error: string
}

type Person = { id: string; name: string }
type Row = { key: string; participantId: string | null; name: string; cost: string }

const lei = (n: number) => `${n.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}\u00a0RON`
let seq = 0
const newKey = () => `r${++seq}`
const toRows = (g: GasCosts): Row[] =>
  g.drivers.map(d => ({ key: newKey(), participantId: d.participantId, name: d.name, cost: d.cost != null ? String(d.cost) : '' }))
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))

export default function GasCostsCalculator({
  hikeId, saved, hikeDrivers, participants, confirmedCount, dict: d,
}: {
  hikeId: string
  saved: GasCosts | null
  hikeDrivers: Person[]          // confirmed participants who said they bring a car
  participants: Person[]         // every confirmed participant, to add a driver from
  confirmedCount: number
  dict: GasCostsDict
}) {
  const fromHike = (): Row[] => hikeDrivers.map(p => ({ key: newKey(), participantId: p.id, name: p.name, cost: '' }))
  const [rows, setRows] = useState<Row[]>(() => (saved ? toRows(saved) : fromHike()))
  const [people, setPeople] = useState(saved?.participants != null ? String(saved.participants) : '')
  const [adding, setAdding] = useState('')        // participant id, '_other', or ''
  const [otherName, setOtherName] = useState('')
  const [dirty, setDirty] = useState(!saved && hikeDrivers.length > 0)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const change = (fn: (r: Row[]) => Row[]) => { setRows(fn); setDirty(true); setMsg(null) }
  const parseCost = (s: string) => { const n = parseFloat(s.replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null }
  const peopleNum = people.trim() ? parseInt(people) : confirmedCount
  const split = splitGas(rows.map(r => ({ participantId: r.participantId, name: r.name, cost: parseCost(r.cost) })), peopleNum)

  const available = participants.filter(p => !rows.some(r => r.participantId === p.id))
  const addDriver = () => {
    if (adding === '_other') {
      if (!otherName.trim()) return
      change(r => [...r, { key: newKey(), participantId: null, name: otherName.trim(), cost: '' }])
    } else {
      const p = participants.find(x => x.id === adding)
      if (!p) return
      change(r => [...r, { key: newKey(), participantId: p.id, name: p.name, cost: '' }])
    }
    setAdding(''); setOtherName('')
  }

  const save = () => {
    setMsg(null)
    startTransition(async () => {
      const res = await saveGasCosts(hikeId, {
        drivers: rows.map(r => ({ participantId: r.participantId, name: r.name, cost: parseCost(r.cost) })),
        participants: people.trim() ? parseInt(people) || null : null,
      })
      if ('error' in res) setMsg({ ok: false, text: d.error })
      else { setDirty(false); setMsg({ ok: true, text: d.saved }) }
    })
  }

  const cls = 'w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white'

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <Fuel size={18} className="text-emerald-600" /> {d.title}
        </h2>
        <p className="text-sm text-stone-500 mt-1">{d.intro}</p>
      </div>

      {/* Drivers and what each spent on gas */}
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-stone-400">{d.noDrivers}</p>}
        {rows.map(r => (
          <div key={r.key} className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-sm font-medium text-stone-800 [overflow-wrap:anywhere]">{r.name}</span>
            <div className="relative w-32 shrink-0">
              <input inputMode="decimal" value={r.cost} placeholder="0" aria-label={`${d.cost} — ${r.name}`}
                onChange={e => { const v = e.target.value; change(rs => rs.map(x => (x.key === r.key ? { ...x, cost: v } : x))) }}
                className={`${cls} pr-12 text-right`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">RON</span>
            </div>
            <button type="button" title={d.remove} aria-label={`${d.remove} — ${r.name}`}
              onClick={() => change(rs => rs.filter(x => x.key !== r.key))}
              className="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 shrink-0">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Add a driver: someone from the hike, or anyone by name */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={adding} onChange={e => setAdding(e.target.value)} className={`${cls} flex-1 min-w-[12rem] sm:w-auto`}>
          <option value="">{d.addDriver}…</option>
          {available.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value="_other">{d.someoneElse}</option>
        </select>
        {adding === '_other' && (
          <input value={otherName} onChange={e => setOtherName(e.target.value)} placeholder={d.name}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDriver() } }}
            className={`${cls} flex-1 min-w-[10rem]`} />
        )}
        <button type="button" onClick={addDriver} disabled={!adding || (adding === '_other' && !otherName.trim())}
          className="flex items-center gap-1.5 border border-stone-200 rounded-xl px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50">
          <Plus size={14} /> {d.add}
        </button>
      </div>

      <div className="max-w-xs">
        <label className="block text-sm font-medium text-stone-700 mb-1">{d.people}</label>
        <input type="number" min="1" value={people} placeholder={String(confirmedCount)}
          onChange={e => { setPeople(e.target.value); setDirty(true); setMsg(null) }} className={cls} />
        <p className="text-xs text-stone-400 mt-1">{fill(d.peopleHint, { n: confirmedCount })}</p>
      </div>

      {/* The result */}
      {split && split.total > 0 && (
        <div className="rounded-xl bg-stone-50 border border-stone-100 p-4 space-y-3 text-sm">
          <div className="flex justify-between gap-3"><span className="text-stone-600">{d.total}</span><strong>{lei(split.total)}</strong></div>
          <div className="flex justify-between gap-3">
            <span className="text-stone-600">{fill(d.share, { n: split.people })}</span>
            <strong className="text-emerald-700 text-base">{lei(split.share)}</strong>
          </div>
          {split.people < rows.length && <p className="text-amber-700">{d.tooFewPeople}</p>}
          <div className="border-t border-stone-200 pt-3 flex justify-between gap-3">
            <span className="text-stone-600">{fill(d.passengersPay, { n: split.passengers, x: lei(split.share) })}</span>
            <span className="text-right">{d.youCollect} <strong>{lei(split.collect)}</strong></span>
          </div>
          <div className="border-t border-stone-200 pt-3 space-y-1.5">
            <div className="text-stone-600">{d.driversOwed}</div>
            {split.drivers.map((r, i) => (
              <div key={rows[i]?.key ?? i} className="flex justify-between gap-3">
                <span className="min-w-0 [overflow-wrap:anywhere]">{r.name} <span className="text-stone-400">({lei(r.cost)} − {lei(split.share)})</span></span>
                {r.owed >= 0
                  ? <span className="shrink-0">{d.youPay} <strong>{lei(r.owed)}</strong></span>
                  : <span className="shrink-0 text-amber-700">{d.paysYou} <strong>{lei(-r.owed)}</strong></span>}
              </div>
            ))}
            <div className="flex justify-between gap-3 pt-1"><span className="text-stone-600">{d.youGive}</span><strong>{lei(split.payout)}</strong></div>
          </div>
          {Math.abs(split.collect - split.payout) >= 0.01 && (
            <div className="border-t border-stone-200 pt-3 flex justify-between gap-3 text-stone-500">
              <span>{d.balance}</span><span>{lei(Math.round((split.collect - split.payout) * 100) / 100)}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={isPending || !dirty}
          className="bg-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
          {isPending ? d.saving : d.save}
        </button>
        <button type="button" onClick={() => { setRows(fromHike()); setDirty(true); setMsg(null) }}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800">
          <RotateCcw size={14} /> {d.resetDrivers}
        </button>
        {msg && <span className={`text-sm font-medium ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </div>
  )
}
