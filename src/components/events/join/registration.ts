import type { HikeParticipant } from '@prisma/client'
import type { Registration } from './types'

type RegistrationSource = Pick<
  HikeParticipant,
  'status' | 'bringsCar' | 'carSeats' | 'carTrip' | 'pickupLat' | 'pickupLng' | 'paymentDeadline'
>

/** Turns a participant row into the serializable props the JoinButton needs. */
export function toRegistration(participation: RegistrationSource | null | undefined): Registration | null {
  if (!participation) return null
  return {
    status: participation.status,
    bringsCar: participation.bringsCar,
    carSeats: participation.carSeats,
    carTrip: participation.carTrip,
    pickupLat: participation.pickupLat,
    pickupLng: participation.pickupLng,
    paymentDeadline: participation.paymentDeadline ? participation.paymentDeadline.toISOString() : null,
  }
}
