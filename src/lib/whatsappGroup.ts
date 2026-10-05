import { toInternationalDigits } from './phone'

export type GroupEntry = { raw: string; name: string; phone: string | null }

export type ComparableParticipant = {
  id: string
  status: string
  friendName?: string | null
  user: { id: string; name: string | null; phone?: string | null } | null
}

export type GroupMatch = {
  entry: GroupEntry
  participant: ComparableParticipant
  // 'phone' and 'name' are reliable; 'partial' means only one name (usually the first) matched
  by: 'phone' | 'name' | 'partial'
}

// Lines WhatsApp adds to a pasted member list that aren't members
const NOISE = new Set([
  'you', 'tu', 'eu', 'admin', 'group admin', 'admin grup', 'admin de grup', 'administrator grup',
  'participants', 'participanți', 'participanti', 'members', 'membri',
])

// WhatsApp wraps phone numbers in invisible bidi control characters
const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/g

export function normalizeName(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(t => t.length >= 2)
}

export function parseGroupList(text: string): GroupEntry[] {
  const seen = new Set<string>()
  const entries: GroupEntry[] = []
  for (const chunk of text.replace(INVISIBLE, '').split(/[\n,;]+/)) {
    const raw = chunk.trim().replace(/^~\s*/, '').trim()
    if (!raw || NOISE.has(raw.toLowerCase()) || seen.has(raw)) continue
    seen.add(raw)

    const phoneText = raw.match(/\+?\d[\d\s\-().]{6,}\d/)?.[0]
    const phone = phoneText && phoneText.replace(/\D/g, '').length >= 8 ? toInternationalDigits(phoneText) : null
    const name = (phoneText ? raw.replace(phoneText, '') : raw).replace(/~/g, '').trim()
    if (!phone && normalizeName(name).length === 0) continue
    entries.push({ raw, name, phone })
  }
  return entries
}

export function participantName(p: ComparableParticipant): string {
  return p.user?.name ?? p.friendName ?? '?'
}

function nameOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const shared = a.filter(t => b.includes(t)).length
  // all tokens of the shorter name must appear in the longer one
  return shared === Math.min(a.length, b.length) ? shared : 0
}

export function compareWithGroup(entries: GroupEntry[], participants: ComparableParticipant[]) {
  const active = participants.filter(p => p.status !== 'rejected')
  // when the same person registered more than once, prefer the confirmed registration
  const rank = (p: ComparableParticipant) => (p.status === 'confirmed' ? 0 : 1)
  const sorted = [...active].sort((a, b) => rank(a) - rank(b))

  const used = new Set<string>()
  const matches: GroupMatch[] = []
  const unmatched = new Set(entries)

  const assign = (entry: GroupEntry, participant: ComparableParticipant, by: GroupMatch['by']) => {
    matches.push({ entry, participant, by })
    used.add(participant.id)
    unmatched.delete(entry)
  }

  // 1. phone number
  for (const entry of entries) {
    if (!entry.phone) continue
    const p = sorted.find(p => !used.has(p.id) && p.user?.phone && toInternationalDigits(p.user.phone) === entry.phone)
    if (p) assign(entry, p, 'phone')
  }

  // 2. full name (at least two name parts in common)
  for (const entry of [...unmatched]) {
    const tokens = normalizeName(entry.name)
    const p = sorted.find(p => !used.has(p.id) && nameOverlap(tokens, normalizeName(participantName(p))) >= 2)
    if (p) assign(entry, p, 'name')
  }

  // 3. a single name in common, only when it points to exactly one person
  for (const entry of [...unmatched]) {
    const tokens = normalizeName(entry.name)
    const candidates = sorted.filter(p => !used.has(p.id) && nameOverlap(tokens, normalizeName(participantName(p))) === 1)
    const distinct = new Set(candidates.map(p => p.user?.id ?? p.id))
    if (distinct.size === 1) assign(entry, candidates[0], 'partial')
  }

  return { matches, unmatched: [...unmatched], matchedIds: used }
}
