import { CheckSquare } from 'lucide-react'

export default function EssentialsSection({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-stone-800 flex items-center gap-2">
        <CheckSquare size={18} /> {title}
      </h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2.5 bg-stone-50 border border-stone-100 rounded-xl px-3.5 py-2.5 text-sm text-stone-700">
            <CheckSquare size={14} className="text-emerald-500 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
