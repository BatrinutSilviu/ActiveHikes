'use client'

import dynamic from 'next/dynamic'

const LocationPickerModal = dynamic(() => import('./LocationPickerModal'), { ssr: false })

export default LocationPickerModal
