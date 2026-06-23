'use client'

import dynamic from 'next/dynamic'

const GpxMap = dynamic(() => import('./GpxMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl border border-stone-200 bg-stone-100 animate-pulse" style={{ height: '340px' }} />
  ),
})

export default GpxMap
