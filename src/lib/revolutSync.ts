import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { getConfirmationPrice } from '@/lib/pricing'
import { confirmParticipant } from '@/lib/participantConfirm'
import { friendCoveredByPayment } from '@/lib/participantPairs'
import { systemActor } from '@/lib/participantLog'

const BASE_URL = 'https://api.enablebanking.com'
const CONSENT_VALID_DAYS = 90

function getCredentials(): { applicationId: string; privateKey: string } | null {
  const applicationId = process.env.ENABLE_BANKING_APPLICATION_ID
  const rawKey = process.env.ENABLE_BANKING_PRIVATE_KEY
  if (!applicationId || !rawKey) return null
  // The key is stored with literal "\n" so it survives as a single-line env var.
  return { applicationId, privateKey: rawKey.replace(/\\n/g, '\n') }
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Enable Banking authenticates every request with a self-signed RS256 JWT —
// no separate token-exchange call needed (unlike GoCardless's /token/new/).
function signJwt(): string {
  const creds = getCredentials()
  if (!creds) throw new Error('Enable Banking credentials are not configured')

  const header = { typ: 'JWT', alg: 'RS256', kid: creds.applicationId }
  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 300 }

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), creds.privateKey)
  return `${signingInput}.${base64url(signature)}`
}

async function ebFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    // A hung request would otherwise block the background sync (it never overlaps itself) indefinitely.
    signal: AbortSignal.timeout(30_000),
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${signJwt()}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Enable Banking request failed (${res.status} ${path}): ${body}`)
  }
  return res.json() as Promise<T>
}

export type Institution = { id: string; name: string }

export async function listInstitutions(country: string): Promise<Institution[]> {
  const data = await ebFetch<{ aspsps: { name: string }[] }>(`/aspsps?country=${country}`)
  // Enable Banking has no separate institution id — the (name, country) pair
  // identifies the ASPSP for the /auth call, so we just reuse the name.
  return data.aspsps.map(a => ({ id: a.name, name: a.name }))
}

export async function startAuthorization(institutionName: string, country: string, redirectUrl: string, reference: string): Promise<{ link: string }> {
  const validUntil = new Date(Date.now() + CONSENT_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const data = await ebFetch<{ url: string }>('/auth', {
    method: 'POST',
    body: JSON.stringify({
      access: { valid_until: validUntil },
      aspsp: { name: institutionName, country },
      state: reference,
      redirect_url: redirectUrl,
      psu_type: 'personal',
    }),
  })
  return { link: data.url }
}

export async function exchangeAuthorizationCode(code: string): Promise<{ sessionId: string; accountId: string | null }> {
  const data = await ebFetch<{ id: string; accounts: { uid: string }[] }>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  return { sessionId: data.id, accountId: data.accounts[0]?.uid ?? null }
}

type EbTransaction = {
  entry_reference?: string
  transaction_amount: { amount: string; currency: string }
  credit_debit_indicator: 'CRDT' | 'DBIT'
  remittance_information?: string[]
  debtor?: { name?: string }
  booking_date?: string
  status?: string
}

async function fetchTransactions(accountId: string): Promise<EbTransaction[]> {
  const data = await ebFetch<{ transactions: EbTransaction[] }>(`/accounts/${accountId}/transactions`)
  return data.transactions
}

function describeTransaction(tx: EbTransaction): string {
  return tx.remittance_information?.join(' ') ?? ''
}

function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (Romanian ă/â/î/ș/ț etc.)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function nameParts(name: string): string[] {
  return normalizeText(name).split(/[\s-]+/).filter(p => p.length >= 2)
}

// Lenient: every "real" word (2+ letters) of the person's name must appear
// somewhere in the text, not necessarily contiguous — handles
// "Popescu Ana", "Ana Popescu plata", initials, etc.
function nameMatchesText(name: string, normalizedText: string): boolean {
  const parts = nameParts(name)
  if (parts.length === 0) return false
  return parts.every(part => normalizedText.includes(part))
}

// Looser check used only for suggestions: any name word of 3+ letters appears.
function namePartlyMatchesText(name: string, normalizedText: string): boolean {
  return nameParts(name).some(part => part.length >= 3 && normalizedText.includes(part))
}

// Registrations a payment could belong to: hosts (friends pay through their
// host) of events that are still open. Waitlisted ones are only
// ever suggested for manual review — a late sync can waitlist someone who paid
// in time, and promoting from the waitlist is the admin's call.
export async function getPaymentCandidatePool() {
  return prisma.hikeParticipant.findMany({
    where: {
      status: { in: ['pending', 'waitlist'] },
      userId: { not: null },
      hostParticipantId: null,
      hike: { status: { notIn: ['completed', 'cancelled', 'draft'] } },
    },
    include: {
      hike: true,
      user: { select: { name: true } },
      friend: { select: { id: true, status: true } },
      matchedTransaction: { select: { id: true } },
    },
    orderBy: { joinedAt: 'desc' },
  })
}

type CandidatePool = Awaited<ReturnType<typeof getPaymentCandidatePool>>

export type PaymentCandidate = {
  participant: CandidatePool[number]
  expectedAmount: number
  amountMatches: boolean
  nameMatches: boolean
  namePartlyMatches: boolean
}

export function findPaymentCandidates(
  payment: { amount: number; description: string; senderName: string | null },
  pool: CandidatePool,
): PaymentCandidate[] {
  const text = normalizeText(`${payment.description} ${payment.senderName ?? ''}`)
  return pool
    .map(p => {
      const name = p.user?.name ?? ''
      const expectedAmount = getConfirmationPrice(p.hike) * (friendCoveredByPayment(p.friend) ? 2 : 1)
      return {
        participant: p,
        expectedAmount,
        amountMatches: Math.abs(expectedAmount - payment.amount) <= 0.001,
        nameMatches: !!name && nameMatchesText(name, text),
        namePartlyMatches: !!name && namePartlyMatchesText(name, text),
      }
    })
    .filter(c => c.amountMatches || c.namePartlyMatches)
    .sort((a, b) =>
      Number(b.amountMatches && b.nameMatches) - Number(a.amountMatches && a.nameMatches) ||
      Number(b.nameMatches) - Number(a.nameMatches) ||
      Number(b.namePartlyMatches) - Number(a.namePartlyMatches) ||
      Number(b.amountMatches) - Number(a.amountMatches))
}

export async function runPaymentSync(): Promise<{ confirmed: number; unmatched: number } | null> {
  if (!getCredentials()) return null

  const connection = await prisma.bankConnection.findFirst({ where: { status: 'linked' }, orderBy: { linkedAt: 'desc' } })
  if (!connection?.accountId) return null

  const transactions = await fetchTransactions(connection.accountId)

  // Skip payments already matched, and ones the admin already assigned or dismissed.
  const [alreadyProcessed, closedReviews] = await Promise.all([
    prisma.processedBankTransaction.findMany({ select: { transactionId: true } }),
    prisma.bankTransactionReview.findMany({ where: { status: { not: 'open' } }, select: { transactionId: true } }),
  ])
  const processedIds = new Set([...alreadyProcessed, ...closedReviews].map(p => p.transactionId))

  const incoming = transactions.filter(tx => {
    const id = tx.entry_reference
    if (!id || processedIds.has(id)) return false
    if (tx.status && tx.status !== 'BOOK') return false
    if (tx.credit_debit_indicator !== 'CRDT') return false
    return tx.transaction_amount.currency === 'RON'
  })

  const pool = await getPaymentCandidatePool()

  let confirmed = 0
  let unmatched = 0

  for (const tx of incoming) {
    const id = tx.entry_reference
    if (!id) continue

    const payment = {
      amount: Number(tx.transaction_amount.amount),
      description: describeTransaction(tx),
      senderName: tx.debtor?.name ?? null,
    }
    const candidates = findPaymentCandidates(payment, pool)
    const certain = candidates.filter(c => c.amountMatches && c.nameMatches)

    // Auto-confirm only when exactly one registration fits both the amount and
    // the name, and it's still pending — everything else goes to the admin.
    if (certain.length === 1 && certain[0].participant.status === 'pending' && !certain[0].participant.matchedTransaction) {
      const match = certain[0].participant
      await confirmParticipant(match.id, match.hikeId, { action: 'payment', actor: systemActor, amount: payment.amount })
      await prisma.processedBankTransaction.create({
        data: { transactionId: id, hikeParticipantId: match.id, amount: payment.amount },
      })
      await prisma.bankTransactionReview.updateMany({
        where: { transactionId: id, status: 'open' },
        data: { status: 'resolved', hikeParticipantId: match.id, resolvedAt: new Date() },
      })
      // Drop them from the pool so a second payment can't match them again.
      pool.splice(pool.indexOf(match), 1)
      confirmed++
    } else if (candidates.length > 0) {
      // Unrelated income (no plausible participant at all) is ignored.
      await prisma.bankTransactionReview.upsert({
        where: { transactionId: id },
        create: {
          transactionId: id,
          amount: payment.amount,
          description: payment.description,
          senderName: payment.senderName,
          bookedAt: tx.booking_date ? new Date(tx.booking_date) : null,
        },
        update: {},
      })
      unmatched++
    }
  }

  await prisma.bankConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date(), lastMatchedCount: confirmed, lastUnmatchedCount: unmatched },
  })

  return { confirmed, unmatched }
}
