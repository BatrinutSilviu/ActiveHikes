// Gas costs (admin, Cars page): every driver's gas is added up and split between everyone who went (drivers
// included), so each person's share is X = total ÷ people. Passengers pay X to the organiser; the organiser gives
// each driver back their own cost minus X (their own share). If a driver spent less than X, they pay the difference.

export type GasDriver = { participantId: string | null; name: string; cost: number | null }
export type GasCosts = { drivers: GasDriver[]; participants: number | null }

const round2 = (n: number) => Math.round(n * 100) / 100

/** Reads what's stored on the hike (or sent by the form), keeping only sane values. Null when there's nothing usable. */
export function parseGasCosts(value: unknown): GasCosts | null {
  if (!value || typeof value !== 'object') return null
  const v = value as { drivers?: unknown; participants?: unknown }
  if (!Array.isArray(v.drivers)) return null
  const drivers = v.drivers.slice(0, 50).flatMap((d): GasDriver[] => {
    if (!d || typeof d !== 'object') return []
    const { participantId, name, cost } = d as Record<string, unknown>
    const n = typeof name === 'string' ? name.trim().slice(0, 100) : ''
    if (!n) return []
    const c = typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 && cost <= 100_000 ? round2(cost) : null
    return [{ participantId: typeof participantId === 'string' && participantId ? participantId : null, name: n, cost: c }]
  })
  const p = v.participants
  const participants = typeof p === 'number' && Number.isInteger(p) && p >= 1 && p <= 1000 ? p : null
  return { drivers, participants }
}

export type GasSplit = {
  total: number
  people: number
  share: number          // X, what each person's gas comes to
  passengers: number     // people who didn't drive
  collect: number        // what the passengers pay the organiser in all
  drivers: { name: string; cost: number; owed: number }[] // owed < 0: the driver pays the organiser
  payout: number         // what the organiser gives the drivers in all (net of drivers who pay)
}

/** The split for `people` people. Null when there's nobody to split between. */
export function splitGas(drivers: GasDriver[], people: number): GasSplit | null {
  if (!(people >= 1)) return null
  const total = round2(drivers.reduce((s, d) => s + (d.cost ?? 0), 0))
  const share = round2(total / people)
  const passengers = Math.max(0, people - drivers.length)
  const rows = drivers.map(d => ({ name: d.name, cost: d.cost ?? 0, owed: round2((d.cost ?? 0) - share) }))
  return {
    total, people, share, passengers,
    collect: round2(passengers * share),
    drivers: rows,
    payout: round2(rows.reduce((s, r) => s + r.owed, 0)),
  }
}
