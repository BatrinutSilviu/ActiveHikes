'use client'

import dynamic from 'next/dynamic'

const PickupMapPicker = dynamic(() => import('./PickupMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl border border-stone-200 bg-stone-100 animate-pulse" style={{ height: '200px' }} />
  ),
})

export default PickupMapPicker
