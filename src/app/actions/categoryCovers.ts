'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { coverKey } from '@/lib/categoryCovers'

/** Sets (or, with null, removes) the default cover photo for a kind of general event. */
export async function setCategoryCover(category: string, imageUrl: string | null) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')
  const key = coverKey(category)
  if (!key) throw new Error('Missing kind of event')
  // Only photos uploaded to this site (the cover bucket) — never an outside address.
  if (imageUrl !== null && !/^\/uploads\/hike-covers\/[\w.-]+$/.test(imageUrl)) throw new Error('Invalid photo')
  if (imageUrl === null) await prisma.eventCategoryCover.deleteMany({ where: { category: key } })
  else await prisma.eventCategoryCover.upsert({ where: { category: key }, create: { category: key, imageUrl }, update: { imageUrl } })
  // Every page that shows events picks the photo up (lists, event pages, profiles, admin).
  revalidatePath('/', 'layout')
}
