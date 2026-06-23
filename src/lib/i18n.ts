import 'server-only'
import type enJson from '@/dictionaries/en.json'

export type Dictionary = typeof enJson
export type Locale = 'en' | 'ro'
export const locales: Locale[] = ['en', 'ro']
export const defaultLocale: Locale = 'ro'

export const hasLocale = (s: string): s is Locale => locales.includes(s as Locale)

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('@/dictionaries/en.json').then(m => m.default),
  ro: () => import('@/dictionaries/ro.json').then(m => m.default),
}

export const getDictionary = (locale: Locale): Promise<Dictionary> => loaders[locale]()

export function revalidateLocalePaths(path: string, fn: (p: string) => void) {
  for (const l of locales) fn(`/${l}${path}`)
}
