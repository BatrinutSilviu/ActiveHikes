'use client'

import Link from 'next/link'
import MyRegistration from './MyRegistration'
import RegistrationForm from './RegistrationForm'
import type { CarTripDict, JoinButtonDict, Registration } from './types'

/**
 * The registration panel of an event: a login link for guests, the sign-up form,
 * or — once registered — the registration's status and car preferences.
 * Used for hikes, Via Ferrata and general events alike (all rows of the same table);
 * `withCar` = false leaves out the carpool questions (general events).
 */
export default function JoinButton({
  hikeId,
  userId,
  isFull,
  registration,
  waitlistPosition = null,
  waitlistCount = 0,
  dict,
  tripDict,
  lang,
  withCar = true,
}: {
  hikeId: string
  userId: string | null
  isFull: boolean
  registration: Registration | null
  waitlistPosition?: number | null
  waitlistCount?: number
  dict: JoinButtonDict
  tripDict: CarTripDict
  lang: string
  withCar?: boolean
}) {
  if (!userId) {
    return (
      <Link href={`/${lang}/auth/login`} className="block w-full text-center bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
        {dict.loginToJoin}
      </Link>
    )
  }

  if (registration) {
    return (
      <MyRegistration
        hikeId={hikeId}
        registration={registration}
        waitlistPosition={waitlistPosition}
        waitlistCount={waitlistCount}
        dict={dict}
        tripDict={tripDict}
        withCar={withCar}
      />
    )
  }

  return <RegistrationForm hikeId={hikeId} isFull={isFull} dict={dict} tripDict={tripDict} lang={lang} withCar={withCar} />
}
