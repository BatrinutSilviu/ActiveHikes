'use client'

import dynamic from 'next/dynamic'

const PickupLocationsMap = dynamic(() => import('./PickupLocationsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl border border-stone-200 bg-stone-100 animate-pulse" style={{ height: '280px' }} />
  ),
})

export default PickupLocationsMap
