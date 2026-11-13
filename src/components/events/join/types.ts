import type { CarTrip } from '@/lib/carTrip'

export type ParticipationStatus = 'pending' | 'confirmed' | 'rejected' | 'waitlist'

/** The signed-in user's registration, as the join panel needs it (dates as ISO strings). */
export type Registration = {
  status: ParticipationStatus
  bringsCar: boolean
  carSeats: number | null
  carTrip: CarTrip
  pickupLat: number | null
  pickupLng: number | null
  paymentDeadline: string | null
}

export type CarTripDict = { label: string; both: string; there: string; back: string }

type StatusEntry = { label: string; desc: string }

export type JoinButtonDict = {
  loginToJoin: string
  registerNow: string
  joinWaitlist: string
  registering: string
  cancelRegistration: string
  cancelling: string
  cancelConfirm: string
  cancelError: string
  joinError: string
  bringFriend: string
  friendNamePlaceholder: string
  agreeToTermsLabel: string
  termsLinkText: string
  carToggleLabel: string
  carOptionDriver: string
  carOptionPassenger: string
  carSeatsLabel: string
  saveCarPreference: string
  savingCarPreference: string
  carSaveError: string
  setPickupLocation: string
  setDeparturePoint: string
  locationSet: string
  changeLocation: string
  locationModalHint: string
  locationPassengerTitle: string
  locationDriverTitle: string
  locationConfirm: string
  locationCancel: string
  payWithin: string
  paymentWindowExpired: string
  waitlistPosition: string
  status: Record<ParticipationStatus, StatusEntry>
}
