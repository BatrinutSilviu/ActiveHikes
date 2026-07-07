'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { Menu, X, LogOut, User } from 'lucide-react'
import { useDict, useLocale } from '@/hooks/useDict'
import LanguageSwitcher from './LanguageSwitcher'

export default function Navbar() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const d = useDict()
  const lang = useLocale()

  const firstName = session?.user?.name?.split(' ')[0]
  const pfx = `/${lang}`

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          <Link href={pfx} className="flex items-center gap-1.5 group">
            <Image src="/logo.png" alt="Active Hikes" width={120} height={40} className="h-9 w-auto" priority />
            <span className="text-2xl font-black tracking-tight text-stone-800 leading-none translate-y-[1px] group-hover:text-emerald-700 transition-colors">
              Hikes
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            <Link href={`${pfx}/hikes`}
              className="px-3.5 py-2 rounded-xl text-sm font-medium text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors">
              {d.nav.hikes}
            </Link>
            {session ? (
              <>
                <Link href={`${pfx}/profile`}
                  className="px-3.5 py-2 rounded-xl text-sm font-medium text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-1.5">
                  <User size={15} /> {firstName}
                </Link>
                <button onClick={() => signOut({ callbackUrl: pfx })}
                  className="px-3.5 py-2 rounded-xl text-sm font-medium text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5">
                  <LogOut size={15} /> {d.nav.signOut}
                </button>
              </>
            ) : (
              <Link href={`${pfx}/auth/login`}
                className="ml-1 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-emerald-200 transition-all">
                {d.nav.login}
              </Link>
            )}
            <div className="ml-1">
              <LanguageSwitcher />
            </div>
          </div>

          <button className="sm:hidden p-2 rounded-xl hover:bg-stone-100 transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden border-t border-stone-100 py-2 pb-4 flex flex-col gap-0.5">
            <Link href={`${pfx}/hikes`}
              className="px-3 py-3 rounded-xl text-stone-700 font-medium hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              onClick={() => setMenuOpen(false)}>
              {d.nav.hikes}
            </Link>
            {session ? (
              <>
                <Link href={`${pfx}/profile`}
                  className="px-3 py-3 rounded-xl text-stone-700 font-medium hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  onClick={() => setMenuOpen(false)}>
                  {d.nav.myProfile}
                </Link>
                <button onClick={() => signOut({ callbackUrl: pfx })}
                  className="text-left px-3 py-3 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors">
                  {d.nav.signOut}
                </button>
              </>
            ) : (
              <Link href={`${pfx}/auth/login`}
                className="px-3 py-3 rounded-xl text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
                onClick={() => setMenuOpen(false)}>
                {d.nav.login}
              </Link>
            )}
            <div className="px-3 pt-2"><LanguageSwitcher /></div>
          </div>
        )}
      </div>
    </nav>
  )
}
