export type CarTrip = 'both' | 'there' | 'back'

export const CAR_TRIPS: CarTrip[] = ['both', 'there', 'back']

export function isCarTrip(value: unknown): value is CarTrip {
  return value === 'both' || value === 'there' || value === 'back'
}

export const goesThere = (t: CarTrip) => t !== 'back'
export const goesBack = (t: CarTrip) => t !== 'there'

/** A passenger can ride with a driver only if the driver covers every leg the passenger needs. */
export function tripCompatible(driverTrip: CarTrip, passengerTrip: CarTrip) {
  return driverTrip === 'both' || driverTrip === passengerTrip
}

/** Seats left on each leg, given the trips of everyone currently riding in the car. */
export function seatsLeftByLeg(carSeats: number, passengerTrips: CarTrip[]) {
  return {
    there: carSeats - passengerTrips.filter(goesThere).length,
    back: carSeats - passengerTrips.filter(goesBack).length,
  }
}

/** Seats still free on the legs a passenger with `trip` needs (min across their legs). */
export function seatsLeftFor(carSeats: number, passengerTrips: CarTrip[], trip: CarTrip) {
  const left = seatsLeftByLeg(carSeats, passengerTrips)
  if (trip === 'there') return left.there
  if (trip === 'back') return left.back
  return Math.min(left.there, left.back)
}

/** Whether `adding` more passengers (with the given trips) fit in the car alongside `existing`. */
export function fitsInCar(carSeats: number, existing: CarTrip[], adding: CarTrip[]) {
  const left = seatsLeftByLeg(carSeats, [...existing, ...adding])
  return left.there >= 0 && left.back >= 0
}
