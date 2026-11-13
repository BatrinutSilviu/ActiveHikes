// Every price in the app is in Romanian lei.
export function formatRon(amount: number): string {
  return `${amount} RON`
}

/** A price, or the "free" label when there is nothing to pay. */
export function priceOrFree(amount: number, freeLabel: string): string {
  return amount > 0 ? formatRon(amount) : freeLabel
}
