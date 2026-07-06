'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'

export async function updateProfileName(firstName: string, lastName: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const first = firstName.trim()
  const last = lastName.trim()
  if (!first || !last) throw new Error('First and last name are required.')

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: `${first} ${last}` },
  })

  revalidateLocalePaths('/profile', revalidatePath)
}
