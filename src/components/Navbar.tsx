'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Mountain, Menu, X, LogOut, User, ShieldCheck } from 'lucide-react'
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
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href={pfx} className="flex items-center gap-2 font-bold text-xl text-emerald-700 hover:text-emerald-800">
            <Mountain size={24} />
            ActiveHikes
          </Link>

          <div className="hidden sm:flex items-center gap-6">
            <Link href={`${pfx}/hikes`} className="text-stone-600 hover:text-stone-900 font-medium">
              {d.nav.hikes}
            </Link>
            {session ? (
              <>
                {session.user.role === 'admin' && (
                  <Link href={`${pfx}/admin`} className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium">
                    <ShieldCheck size={16} /> {d.nav.admin}
                  </Link>
                )}
                <Link href={`${pfx}/profile`} className="flex items-center gap-1 text-stone-600 hover:text-stone-900 font-medium">
                  <User size={16} /> {firstName}
                </Link>
                <button onClick={() => signOut({ callbackUrl: pfx })} className="flex items-center gap-1 text-stone-500 hover:text-red-600 transition-colors">
                  <LogOut size={16} /> {d.nav.signOut}
                </button>
              </>
            ) : (
              <>
                <Link href={`${pfx}/auth/login`} className="text-stone-600 hover:text-stone-900 font-medium">{d.nav.login}</Link>
                <Link href={`${pfx}/auth/signup`} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium transition-colors">
                  {d.nav.signUp}
                </Link>
              </>
            )}
            <LanguageSwitcher />
          </div>

          <button className="sm:hidden p-2 rounded-lg hover:bg-stone-100" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden border-t border-stone-100 py-2 flex flex-col">
            <Link href={`${pfx}/hikes`} className="text-stone-700 font-medium px-2 py-3 rounded-lg hover:bg-stone-50 active:bg-stone-100" onClick={() => setMenuOpen(false)}>{d.nav.hikes}</Link>
            {session ? (
              <>
                {session.user.role === 'admin' && (
                  <Link href={`${pfx}/admin`} className="text-emerald-700 font-medium px-2 py-3 rounded-lg hover:bg-emerald-50 active:bg-emerald-100" onClick={() => setMenuOpen(false)}>{d.nav.adminDashboard}</Link>
                )}
                <Link href={`${pfx}/profile`} className="text-stone-700 font-medium px-2 py-3 rounded-lg hover:bg-stone-50 active:bg-stone-100" onClick={() => setMenuOpen(false)}>{d.nav.myProfile}</Link>
                <button onClick={() => signOut({ callbackUrl: pfx })} className="text-left text-red-600 font-medium px-2 py-3 rounded-lg hover:bg-red-50 active:bg-red-100">{d.nav.signOut}</button>
              </>
            ) : (
              <>
                <Link href={`${pfx}/auth/login`} className="text-stone-700 font-medium px-2 py-3 rounded-lg hover:bg-stone-50 active:bg-stone-100" onClick={() => setMenuOpen(false)}>{d.nav.login}</Link>
                <Link href={`${pfx}/auth/signup`} className="text-emerald-700 font-medium px-2 py-3 rounded-lg hover:bg-emerald-50 active:bg-emerald-100" onClick={() => setMenuOpen(false)}>{d.nav.signUp}</Link>
              </>
            )}
            <div className="px-2 py-3"><LanguageSwitcher /></div>
          </div>
        )}
      </div>
    </nav>
  )
}
