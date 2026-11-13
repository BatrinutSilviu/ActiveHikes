'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Users, UserX, UserCheck, AlertTriangle, X, Bookmark } from 'lucide-react'
import PhoneContact from './PhoneContact'
import {
  compareWithGroup, parseGroupList, participantName, type ComparableParticipant,
} from '@/lib/whatsappGroup'
import { buildBookmarklet, type BookmarkletLabels } from '@/lib/whatsappBookmarklet'

type WhatsAppCompareDict = {
  title: string
  hint: string
  bookmarkletSteps: string
  bookmarkletButton: string
  bookmarkletDragHint: string
  bookmarklet: BookmarkletLabels
  placeholder: string
  clear: string
  missingTitle: string
  missingEmpty: string
  extraTitle: string
  extraEmpty: string
  notRegistered: string
  onSiteAs: string
  matchedTitle: string
  firstNameOnly: string
  ignore: string
  showIgnored: string
  copyPhone: string
  phoneCopied: string
  openWhatsApp: string
}

type Stored = { text: string; ignored: string[] }

export default function WhatsAppGroupCompare({
  eventId,
  participants,
  adminUserId,
  statusLabels,
  dict,
}: {
  eventId: string
  participants: ComparableParticipant[]
  adminUserId: string | null
  statusLabels: Record<string, string>
  dict: WhatsAppCompareDict
}) {
  const storageKey = `whatsapp-compare:${eventId}`
  const [text, setText] = useState('')
  const [ignored, setIgnored] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const bookmarkletRef = useRef<HTMLAnchorElement>(null)

  // React refuses javascript: URLs in href, so the bookmarklet is set directly on the DOM node
  useEffect(() => {
    bookmarkletRef.current?.setAttribute('href', buildBookmarklet(dict.bookmarklet))
  }, [dict.bookmarklet])

  // The pasted list is a per-browser convenience so it survives a page reload
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as Stored
        setText(parsed.text ?? '')
        setIgnored(parsed.ignored ?? [])
      }
    } catch {}
    setLoaded(true)
  }, [storageKey])

  useEffect(() => {
    if (!loaded) return
    try {
      if (text) localStorage.setItem(storageKey, JSON.stringify({ text, ignored } satisfies Stored))
      else localStorage.removeItem(storageKey)
    } catch {}
  }, [loaded, storageKey, text, ignored])

  const result = useMemo(() => {
    if (!text.trim()) return null
    const entries = parseGroupList(text)
    const { matches, unmatched, matchedIds } = compareWithGroup(entries, participants)
    const missing = participants.filter(p =>
      p.status === 'confirmed' && !matchedIds.has(p.id) && (!adminUserId || p.user?.id !== adminUserId))
    const notConfirmed = matches.filter(m => m.participant.status !== 'confirmed')
    const confirmedMatches = matches.filter(m => m.participant.status === 'confirmed')
    return { missing, unmatched, notConfirmed, confirmedMatches }
  }, [text, participants, adminUserId])

  const visibleUnmatched = result?.unmatched.filter(e => !ignored.includes(e.raw)) ?? []
  const ignoredCount = (result?.unmatched.length ?? 0) - visibleUnmatched.length
  const extraCount = visibleUnmatched.length + (result?.notConfirmed.length ?? 0)

  return (
    <details className="bg-white border border-stone-100 rounded-2xl p-5 group">
      <summary className="flex items-center gap-2 cursor-pointer list-none font-bold text-stone-800">
        <Users size={18} className="text-emerald-600" /> {dict.title}
      </summary>

      <div className="mt-3 bg-stone-50 rounded-xl p-3 text-sm text-stone-600">
        <p className="whitespace-pre-line">{dict.bookmarkletSteps}</p>
        <a ref={bookmarkletRef} onClick={e => { e.preventDefault(); alert(dict.bookmarkletDragHint) }}
          title={dict.bookmarkletDragHint}
          className="mt-2 inline-flex items-center gap-1.5 bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg cursor-grab">
          <Bookmark size={14} /> {dict.bookmarkletButton}
        </a>
      </div>
      <p className="text-stone-500 text-sm mt-3 whitespace-pre-line">{dict.hint}</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={dict.placeholder}
        rows={5}
        className="mt-3 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      {text && (
        <button type="button" onClick={() => { setText(''); setIgnored([]) }}
          className="text-xs text-stone-400 hover:text-stone-700 hover:underline">
          {dict.clear}
        </button>
      )}

      {result && (
        <div className="mt-4 space-y-5">
          <section>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-700 mb-2">
              <UserX size={15} /> {dict.missingTitle} ({result.missing.length})
            </h3>
            {result.missing.length === 0 ? (
              <p className="text-sm text-stone-400">{dict.missingEmpty}</p>
            ) : (
              <ul className="space-y-1.5">
                {result.missing.map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm bg-red-50 rounded-lg px-3 py-1.5">
                    <span className="text-stone-800 truncate">{participantName(p)}</span>
                    {p.user?.phone && <PhoneContact phone={p.user.phone} dict={dict} />}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 mb-2">
              <AlertTriangle size={15} /> {dict.extraTitle} ({extraCount})
            </h3>
            {extraCount === 0 ? (
              <p className="text-sm text-stone-400">{dict.extraEmpty}</p>
            ) : (
              <ul className="space-y-1.5">
                {result.notConfirmed.map(m => (
                  <li key={m.entry.raw} className="flex items-center justify-between gap-2 text-sm bg-amber-50 rounded-lg px-3 py-1.5">
                    <span className="text-stone-800 truncate">{m.entry.raw}</span>
                    <span className="text-xs text-amber-700 shrink-0">
                      {dict.onSiteAs.replace('{name}', participantName(m.participant))
                        .replace('{status}', statusLabels[m.participant.status] ?? m.participant.status)}
                    </span>
                  </li>
                ))}
                {visibleUnmatched.map(e => (
                  <li key={e.raw} className="flex items-center justify-between gap-2 text-sm bg-amber-50 rounded-lg px-3 py-1.5">
                    <span className="text-stone-800 truncate">{e.raw}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-amber-700">{dict.notRegistered}</span>
                      <button type="button" onClick={() => setIgnored(i => [...i, e.raw])} title={dict.ignore}
                        aria-label={dict.ignore} className="p-0.5 rounded text-stone-400 hover:text-stone-700 hover:bg-amber-100">
                        <X size={13} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {ignoredCount > 0 && (
              <button type="button" onClick={() => setIgnored([])}
                className="mt-1.5 text-xs text-stone-400 hover:text-stone-700 hover:underline">
                {dict.showIgnored.replace('{count}', String(ignoredCount))}
              </button>
            )}
          </section>

          <section>
            <details>
              <summary className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 cursor-pointer list-none">
                <UserCheck size={15} /> {dict.matchedTitle} ({result.confirmedMatches.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {result.confirmedMatches.map(m => (
                  <li key={m.entry.raw} className="text-sm text-stone-600">
                    {participantName(m.participant)}
                    <span className="text-stone-400"> ↔ {m.entry.raw}</span>
                    {m.by === 'partial' && (
                      <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{dict.firstNameOnly}</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </section>
        </div>
      )}
    </details>
  )
}
