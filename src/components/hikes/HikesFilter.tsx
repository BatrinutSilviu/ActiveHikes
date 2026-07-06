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
    <div className="flex flex-wrap items-center gap-2 mb-8">
      <button
        onClick={() => navigate(null, null)}
        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
          !selectedYear
            ? 'bg-stone-900 text-white shadow-sm'
            : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900'
        }`}
      >
        {dict.filterAll}
      </button>

      <div className="w-px h-5 bg-stone-200 mx-1" />

      {availableYears.map(year => (
        <button
          key={year}
          onClick={() => navigate(year, null)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            selectedYear === year && !selectedMonth
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900'
          }`}
        >
          {year}
        </button>
      ))}

      {selectedYear && availableMonths.length > 0 && (
        <>
          <div className="w-px h-5 bg-stone-200 mx-1" />
          {availableMonths.map(month => (
            <button
              key={month}
              onClick={() => navigate(selectedYear, month)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                selectedMonth === month
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-emerald-300 hover:text-emerald-700'
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
