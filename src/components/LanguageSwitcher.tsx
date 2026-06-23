'use client'
import { usePathname, useRouter } from 'next/navigation'

export default function LanguageSwitcher() {
  const pathname = usePathname()
  const router = useRouter()

  const current = (pathname?.split('/')[1] === 'en') ? 'en' : 'ro'
  const next = current === 'ro' ? 'en' : 'ro'

  const handleSwitch = () => {
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`
    const newPath = pathname.replace(`/${current}`, `/${next}`)
    router.push(newPath)
  }

  return (
    <button
      onClick={handleSwitch}
      className="text-xs font-semibold px-2 py-1 rounded-md border border-stone-200 text-stone-500 hover:border-emerald-400 hover:text-emerald-700 transition-colors uppercase tracking-wide"
      title={next === 'ro' ? 'Română' : 'English'}
    >
      {next}
    </button>
  )
}
