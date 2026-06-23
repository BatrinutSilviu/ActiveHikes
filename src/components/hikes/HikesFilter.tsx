'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export default function HikesFilter({
  dateMap,
  locale,
  dict,
}: {
  dateMap: Record<number, number[]>
  locale: string
  dict: { filterAll: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedYear = searchParams.get('year') ? Number(searchParams.get('year')) : null
  const selectedMonth = searchParams.get('month') ? Number(searchParams.get('month')) : null

  const availableYears = Object.keys(dateMap).map(Number).sort((a, b) => b - a)
  const availableMonths = selectedYear ? (dateMap[selectedYear] ?? []) : []

  const navigate = useCallback((year: number | null, month: number | null) => {
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (month) params.set('month', String(month))
    const qs = params.toString()
    router.push(pathname + (qs ? `?${qs}` : ''))
  }, [router, pathname])

  if (availableYears.length === 0) return null

  const monthName = (month: number) =>
    new Date(2000, month - 1, 1).toLocaleDateString(locale, { month: 'long' })

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <button
        onClick={() => navigate(null, null)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          !selectedYear
            ? 'bg-stone-800 text-white'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`}
      >
        {dict.filterAll}
      </button>

      {availableYears.map(year => (
        <button
          key={year}
          onClick={() => navigate(year, null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selectedYear === year && !selectedMonth
              ? 'bg-stone-800 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {year}
        </button>
      ))}

      {selectedYear && availableMonths.length > 0 && (
        <>
          <span className="text-stone-300 select-none">·</span>
          {availableMonths.map(month => (
            <button
              key={month}
              onClick={() => navigate(selectedYear, month)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                selectedMonth === month
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {monthName(month)}
            </button>
          ))}
        </>
      )}
    </div>
  )
}
