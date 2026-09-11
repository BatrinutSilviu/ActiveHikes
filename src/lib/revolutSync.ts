import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { getConfirmationPrice } from '@/lib/pricing'
import { confirmParticipant } from '@/lib/participantConfirm'

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
    .replace(/[̀-ͯ]/g, '') // strip diacritics (Romanian ă/â/î/ș/ț etc.)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Lenient: every "real" word (2+ letters) of the person's name must appear
// somewhere in the description, not necessarily contiguous — handles
// "Popescu Ana", "Ana Popescu plata", initials, etc.
function nameMatchesDescription(name: string, normalizedDescription: string): boolean {
  const parts = normalizeText(name).split(' ').filter(p => p.length >= 2)
  if (parts.length === 0) return false
  return parts.every(part => normalizedDescription.includes(part))
}

export async function runPaymentSync(): Promise<{ confirmed: number; unmatched: number } | null> {
  if (!getCredentials()) return null

  const connection = await prisma.bankConnection.findFirst({ where: { status: 'linked' }, orderBy: { linkedAt: 'desc' } })
  if (!connection?.accountId) return null

  const transactions = await fetchTransactions(connection.accountId)

  const alreadyProcessed = await prisma.processedBankTransaction.findMany({ select: { transactionId: true } })
  const processedIds = new Set(alreadyProcessed.map(p => p.transactionId))

  const incoming = transactions.filter(tx => {
    const id = tx.entry_reference
    if (!id || processedIds.has(id)) return false
    if (tx.status && tx.status !== 'BOOK') return false
    if (tx.credit_debit_indicator !== 'CRDT') return false
    return tx.transaction_amount.currency === 'RON'
  })

  const pendingHosts = await prisma.hikeParticipant.findMany({
    where: { status: 'pending', userId: { not: null } },
    include: { hike: true, user: { select: { name: true } }, friend: { select: { id: true } } },
  })

  let confirmed = 0
  let unmatched = 0

  for (const tx of incoming) {
    const id = tx.entry_reference
    if (!id) continue

    const amount = Number(tx.transaction_amount.amount)
    const description = normalizeText(describeTransaction(tx))

    const candidates = pendingHosts.filter(p => {
      if (!p.user?.name) return false
      const expected = getConfirmationPrice(p.hike) * (p.friend ? 2 : 1)
      if (Math.abs(expected - amount) > 0.001) return false
      return nameMatchesDescription(p.user.name, description)
    })

    if (candidates.length === 1) {
      const match = candidates[0]
      await confirmParticipant(match.id, match.hikeId)
      await prisma.processedBankTransaction.create({
        data: { transactionId: id, hikeParticipantId: match.id, amount },
      })
      confirmed++
    } else {
      unmatched++
    }
  }

  await prisma.bankConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date(), lastMatchedCount: confirmed, lastUnmatchedCount: unmatched },
  })

  return { confirmed, unmatched }
}
