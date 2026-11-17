import Image from 'next/image'
import { Zap } from 'lucide-react'

// The site's name, "act!ve Events": the community's act!ve logo with "Events" beside it.
// `size` is the header's (md) or the bigger one on the sign-in pages (lg).
export const BRAND_NAME = 'Active Events'

export default function BrandMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const lg = size === 'lg'
  return (
    <span className="group inline-flex items-center gap-0.5">
      {/* Served as-is (unoptimized): it's a small static PNG, and its intrinsic size reserves the space. */}
      <Image src="/logo.png" alt="act!ve" width={512} height={118} className={lg ? 'h-9 min-[380px]:h-11 w-auto' : 'h-9 w-auto'} unoptimized priority />
      <span className="relative flex items-center leading-none translate-y-[4px]">
        <Zap
          size={lg ? 20 : 18}
          strokeWidth={2}
          fill="currentColor"
          className="absolute -top-3.5 -right-3 text-emerald-500 group-hover:-translate-y-0.5 group-hover:rotate-12 transition-transform"
        />
        <span className={`${lg ? 'text-[1.7rem] min-[380px]:text-[2rem]' : 'text-3xl'} font-black tracking-tight bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 bg-clip-text text-transparent`}>
          Events
        </span>
      </span>
    </span>
  )
}
