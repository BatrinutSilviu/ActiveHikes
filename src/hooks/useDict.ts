'use client'
import { usePathname } from 'next/navigation'
import en from '@/dictionaries/en.json'
import ro from '@/dictionaries/ro.json'

const dicts = { en, ro } as const
type Locale = keyof typeof dicts

export function useLocale(): Locale {
  const pathname = usePathname()
  const seg = pathname?.split('/')[1]
  return seg === 'en' || seg === 'ro' ? seg : 'ro'
}

export function useDict() {
  return dicts[useLocale()]
}
