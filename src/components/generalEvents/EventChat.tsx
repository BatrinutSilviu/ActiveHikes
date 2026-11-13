'use client'

import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/net'

// A general event's chat (api/events/[id]/chat): the newest page of messages, refreshed every few
// seconds while it's open; older pages load when the reader asks. Participants and organisers write.

const POLL_MS = 5000
const MAX_LENGTH = 1000

type Message = {
  id: string
  body: string
  fromAdmin: boolean
  createdAt: string
  user: { id: string; name: string | null } | null
}
type ChatData = { canRead: boolean; open: boolean; closesAt: string; messages: Message[]; hasMore: boolean }

export type EventChatDict = {
  title: string; closedOn: string; openUntil: string; empty: string; emptyClosed: string; earlier: string; loading: string
  placeholder: string; placeholderAdmin: string; send: string; delete: string; confirmDelete: string; organisers: string
  closedNote: string; forParticipants: string; loginToJoin: string; loginLink: string; today: string; yesterday: string; error: string
}

export default function EventChat({ eventId, userId, isAdmin, lang, locale, dict }: {
  eventId: string
  userId: string | null
  isAdmin: boolean
  lang: string
  locale: string
  dict: EventChatDict
}) {
  const url = `/api/events/${eventId}/chat`
  const [data, setData] = useState<ChatData | null>(null)
  const [older, setOlder] = useState<Message[]>([])
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const heightBefore = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch(url, { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch { /* offline: try again on the next tick */ }
  }, [url])

  useEffect(() => {
    // Loading the chat after the page shows is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])
  useEffect(() => {
    if (!data?.canRead || !data.open) return
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, POLL_MS)
    return () => clearInterval(timer)
  }, [data?.canRead, data?.open, refresh])

  const latest = data?.messages ?? []
  const latestIds = new Set(latest.map(m => m.id))
  const messages = [...older.filter(m => !latestIds.has(m.id)), ...latest]
  const hasEarlier = olderHasMore ?? data?.hasMore ?? false
  const lastId = messages.at(-1)?.id

  useLayoutEffect(() => {
    const el = listRef.current
    if (el && heightBefore.current !== null) {
      el.scrollTop += el.scrollHeight - heightBefore.current
      heightBefore.current = null
    }
  }, [older])
  useLayoutEffect(() => {
    const el = listRef.current
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight
  }, [lastId])

  async function loadOlder() {
    const first = messages[0]
    if (!first || loadingOlder) return
    setLoadingOlder(true)
    try {
      const res = await apiFetch(`${url}?before=${encodeURIComponent(first.id)}`)
      if (!res.ok) throw new Error()
      const page: ChatData = await res.json()
      heightBefore.current = listRef.current?.scrollHeight ?? null
      setOlder(o => [...page.messages, ...o])
      setOlderHasMore(page.hasMore)
    } catch {
      setError(dict.error)
    } finally {
      setLoadingOlder(false)
    }
  }

  async function send() {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    try {
      const res = await apiFetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body }) })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? dict.error)
      setText('')
      nearBottom.current = true
      await refresh()
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : dict.error)
    } finally {
      setSending(false)
    }
  }

  async function remove(id: string) {
    if (!confirm(dict.confirmDelete)) return
    try {
      const res = await apiFetch(`${url}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setOlder(o => o.filter(m => m.id !== id))
      await refresh()
    } catch {
      setError(dict.error)
    }
  }

  const time = (d: Date) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const day = (d: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return dict.today
    if (d.toDateString() === yesterday.toDateString()) return dict.yesterday
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (!data) return null
  if (!data.canRead) {
    if (!data.open) return null
    return (
      <section id="chat" className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
        <p className="font-bold text-stone-800">💬 {dict.title}</p>
        <p className="text-sm text-stone-500 mt-1">
          {userId
            ? dict.forParticipants
            : <><Link href={`/${lang}/auth/login`} className="text-emerald-700 font-semibold underline">{dict.loginLink}</Link> {dict.loginToJoin}</>}
        </p>
      </section>
    )
  }

  const closes = new Date(data.closesAt)
  return (
    <section id="chat" className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden scroll-mt-20">
      <div className="px-5 py-3 border-b border-stone-100 flex items-baseline justify-between gap-3">
        <p className="font-bold text-stone-800 whitespace-nowrap">💬 {dict.title}</p>
        <p className="text-xs text-stone-400 text-right">
          {data.open ? dict.openUntil.replace('{when}', `${day(closes).toLowerCase()} ${time(closes)}`) : dict.closedOn}
        </p>
      </div>

      <div
        ref={listRef}
        onScroll={e => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60 }}
        className="max-h-[60vh] sm:max-h-96 overflow-y-auto px-3 sm:px-4 py-3 space-y-1.5 bg-stone-50"
      >
        {hasEarlier && (
          <div className="text-center pb-1">
            <button type="button" onClick={loadOlder} disabled={loadingOlder}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-stone-200 text-stone-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50">
              {loadingOlder ? dict.loading : dict.earlier}
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <p className="text-center text-sm text-stone-400 py-6">{data.open ? dict.empty : dict.emptyClosed}</p>
        )}
        {messages.map((m, i) => {
          const at = new Date(m.createdAt)
          const prev = messages[i - 1]
          const newDay = !prev || new Date(prev.createdAt).toDateString() !== at.toDateString()
          const mine = !!userId && m.user?.id === userId && m.fromAdmin === isAdmin
          const sameAuthor = !newDay && prev && prev.fromAdmin === m.fromAdmin && prev.user?.id === m.user?.id
          const canDelete = isAdmin || (data.open && mine && !m.fromAdmin)
          return (
            <div key={m.id}>
              {newDay && <p className="text-center text-[11px] font-bold text-stone-400 uppercase tracking-wide py-1.5">{day(at)}</p>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${sameAuthor ? '' : 'pt-1'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 ${
                  mine ? 'bg-emerald-600 text-white rounded-br-md'
                  : m.fromAdmin ? 'bg-stone-800 text-white rounded-bl-md'
                  : 'bg-white border border-stone-200 text-stone-800 rounded-bl-md'
                }`}>
                  {!mine && !sameAuthor && (
                    <p className={`text-[11px] font-bold truncate ${m.fromAdmin ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      {m.fromAdmin ? dict.organisers : m.user?.name ?? '—'}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</p>
                  <p className={`text-[10px] text-right mt-0.5 ${mine || m.fromAdmin ? 'text-white/70' : 'text-stone-400'}`}>
                    {time(at)}
                    {canDelete && (
                      <button type="button" onClick={() => remove(m.id)} className="ml-2 underline opacity-70 hover:opacity-100">{dict.delete}</button>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {data.open ? (
        <div className="px-3 sm:px-4 py-3 border-t border-stone-100">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                // Enter sends on a keyboard; Shift+Enter starts a new line.
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() }
              }}
              rows={1}
              maxLength={MAX_LENGTH}
              placeholder={isAdmin ? dict.placeholderAdmin : dict.placeholder}
              aria-label={dict.placeholder}
              className="flex-1 min-w-0 resize-none max-h-32 border border-stone-200 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white field-sizing-content"
            />
            <button type="button" onClick={send} disabled={!text.trim() || sending}
              className="shrink-0 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40">
              {dict.send}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
        </div>
      ) : (
        <p className="px-5 py-3 border-t border-stone-100 text-xs text-stone-400">{dict.closedNote}</p>
      )}
    </section>
  )
}
