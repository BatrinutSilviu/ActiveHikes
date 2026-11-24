'use client'

// A styled single-choice dropdown (instead of the browser's <select>): a button showing the choice, and a list that
// opens under it (or above, when there's no room below). Options can have a second line / badge and be disabled.
// Keyboard: arrows move, Enter/Space picks, Escape closes; tapping outside closes.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export type DropdownOption = {
  value: string
  label: string
  hint?: ReactNode      // shown under the label in the list
  badge?: ReactNode     // shown on the right in the list
  disabled?: boolean
}

export default function Dropdown({
  value, options, onChange, placeholder = '—', disabled, size = 'md', align = 'left', className = '', ariaLabel,
}: {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  align?: 'left' | 'right'
  className?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const [active, setActive] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const id = useId()
  const current = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  useEffect(() => {
    if (open && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const openList = () => {
    const r = ref.current?.getBoundingClientRect()
    setUp(!!r && window.innerHeight - r.bottom < 300 && r.top > window.innerHeight - r.bottom)
    setActive(Math.max(0, options.findIndex(o => o.value === value)))
    setOpen(true)
  }
  const pick = (o: DropdownOption) => {
    if (o.disabled) return
    setOpen(false)
    if (o.value !== value) onChange(o.value)
  }
  const step = (dir: 1 | -1) => {
    for (let i = 1; i <= options.length; i++) {
      const j = (active + dir * i + options.length) % options.length
      if (!options[j].disabled) { setActive(j); return }
    }
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); step(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (options[active]) pick(options[active]) }
    else if (e.key === 'Tab') setOpen(false)
  }

  const pad = size === 'sm' ? 'px-3 py-1.5 rounded-lg' : 'px-3.5 py-2.5 rounded-xl'

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        className={`w-full flex items-center justify-between gap-2 border bg-white text-left text-sm transition-colors
          ${pad} ${open ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-stone-200 hover:border-stone-300'}
          focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className={`truncate ${current ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>{current?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={id}
          role="listbox"
          className={`absolute z-40 ${align === 'right' ? 'right-0' : 'left-0'} ${up ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}
            min-w-full w-max max-w-[min(22rem,calc(100vw-2rem))] max-h-72 overflow-auto
            bg-white border border-stone-200 rounded-xl shadow-lg shadow-stone-900/10 p-1`}
        >
          {options.map((o, i) => {
            const selected = o.value === value
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={selected}
                aria-disabled={o.disabled || undefined}
                onPointerEnter={() => !o.disabled && setActive(i)}
                onClick={() => pick(o)}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm select-none
                  ${o.disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}
                  ${i === active && !o.disabled ? 'bg-emerald-50' : ''}`}
              >
                <Check size={15} className={`shrink-0 text-emerald-600 ${selected ? '' : 'invisible'}`} />
                <span className="flex-1 min-w-0">
                  <span className={`block [overflow-wrap:anywhere] ${selected ? 'font-semibold text-emerald-800' : 'text-stone-800'}`}>{o.label}</span>
                  {o.hint && <span className="block text-xs text-stone-400">{o.hint}</span>}
                </span>
                {o.badge && <span className="shrink-0">{o.badge}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
