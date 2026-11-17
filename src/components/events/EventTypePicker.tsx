'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bike, Check, ChevronDown, CircleDot, Dumbbell, Footprints, Goal, Medal, Mountain, MountainSnow,
  PartyPopper, Plus, Sparkles, Target, Trophy, Volleyball, type LucideIcon,
} from 'lucide-react'

// The "kind of event" picker on the new-event page: a card-style dropdown with an icon per kind,
// hike and via ferrata first, then the management app's event types.

export type EventTypeOption = { value: string; label: string; icon?: string }

const ICONS: Record<string, LucideIcon> = {
  hike: Mountain,
  via_ferrata: MountainSnow,
  football: Goal,
  'foot tennis': CircleDot,
  basketball: Trophy,
  volleyball: Volleyball,
  handball: Medal,
  tennis: Target,
  hyrox: Dumbbell,
  biking: Bike,
  running: Footprints,
  social: PartyPopper,
}

function TypeIcon({ option, isNew, size }: { option?: EventTypeOption; isNew?: boolean; size: number }) {
  const Icon = isNew ? Plus : option ? ICONS[(option.icon ?? option.label).trim().toLowerCase()] ?? Sparkles : Sparkles
  return <Icon size={size} strokeWidth={2} />
}

export default function EventTypePicker({ value, onChange, main, others, newOption, placeholder }: {
  value: string
  onChange: (value: string) => void
  main: EventTypeOption[] // hike, via ferrata
  others: EventTypeOption[] // the general event kinds
  newOption?: EventTypeOption // "Other…" — type a new kind
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    // Start keyboard users on the chosen kind (or the first one).
    ref.current?.querySelector<HTMLButtonElement>('[aria-selected="true"], [role="option"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const all = [...main, ...others, ...(newOption ? [newOption] : [])]
  const selected = all.find(o => o.value === value)

  const pick = (v: string) => { onChange(v); setOpen(false); trigger.current?.focus() }

  // Up/down arrows move between the options.
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  const item = (o: EventTypeOption, isNew = false) => {
    const active = o.value === value
    return (
      <button
        key={o.value}
        type="button"
        role="option"
        aria-selected={active}
        onClick={() => pick(o.value)}
        className={`group flex items-center gap-3 w-full rounded-xl px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:bg-emerald-50 ${
          active ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
        }`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          active ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 group-focus-visible:bg-emerald-100 group-focus-visible:text-emerald-700'
        }`}>
          <TypeIcon option={o} isNew={isNew} size={16} />
        </span>
        <span className="flex-1 truncate">{o.label}</span>
        {active && <Check size={16} className="text-emerald-600 shrink-0" />}
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          open ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-stone-200 hover:border-stone-300 hover:shadow'
        }`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          selected ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-400'
        }`}>
          <TypeIcon option={selected} isNew={!!selected && selected === newOption} size={18} />
        </span>
        <span className={`flex-1 truncate text-base sm:text-sm ${selected ? 'font-semibold text-stone-800' : 'text-stone-400'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-stone-400 transition-transform duration-200 ${open ? 'rotate-180 text-emerald-600' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          onKeyDown={onListKey}
          className="absolute z-30 mt-2 w-full max-h-[min(26rem,65vh)] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-xl shadow-stone-900/10 animate-[pickerIn_140ms_ease-out]"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {main.map(o => item(o))}
          </div>
          {others.length > 0 && <div className="my-2 h-px bg-stone-100" />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {others.map(o => item(o))}
          </div>
          {newOption && (
            <>
              <div className="my-2 h-px bg-stone-100" />
              {item(newOption, true)}
            </>
          )}
        </div>
      )}
      <style>{`@keyframes pickerIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }`}</style>
    </div>
  )
}
