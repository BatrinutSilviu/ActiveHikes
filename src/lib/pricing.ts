import type { Prisma, HikeType } from '@prisma/client'

type ConfirmationPriceInput = {
  type: HikeType
  entryFee: Prisma.Decimal | number
  hasAccommodation: boolean
  accommodationDeposit: Prisma.Decimal | number | null
}

// The amount a participant must pay to get confirmed — entry fee plus an
// accommodation deposit for hikes that have one, or just the advance fee for
// Via Ferrata events (which have no separate entry fee).
export function getConfirmationPrice(hike: ConfirmationPriceInput): number {
  if (hike.type === 'via_ferrata') {
    return hike.accommodationDeposit ? Number(hike.accommodationDeposit) : 0
  }
  const entryFee = Number(hike.entryFee)
  const accommodationDeposit = hike.hasAccommodation && hike.accommodationDeposit ? Number(hike.accommodationDeposit) : 0
  return entryFee + accommodationDeposit
}
