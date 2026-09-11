'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'
import { randomBytes } from 'crypto'
import { listInstitutions, startAuthorization, runPaymentSync, type Institution } from '@/lib/revolutSync'

const COUNTRY = 'RO'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')
}

export async function listRevolutInstitutions(): Promise<Institution[]> {
  await requireAdmin()
  const institutions = await listInstitutions(COUNTRY)
  return institutions.filter(i => i.name.toLowerCase().includes('revolut'))
}

export async function connectRevolut(institutionId: string, institutionName: string): Promise<{ link: string }> {
  await requireAdmin()

  const reference = randomBytes(16).toString('hex')
  // Enable Banking requires an exact match against the app's registered
  // redirect URLs, so the correlation reference travels as the `state`
  // param instead of being appended to the URL (as it was for GoCardless).
  const redirectUrl = `${process.env.NEXTAUTH_URL}/api/bank-connection/callback`
  const { link } = await startAuthorization(institutionId, COUNTRY, redirectUrl, reference)

  await prisma.bankConnection.create({
    data: { institutionId, institutionName, reference, status: 'pending' },
  })

  return { link }
}

export async function disconnectRevolut() {
  await requireAdmin()
  await prisma.bankConnection.deleteMany({})
  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
}

export async function syncRevolutNow() {
  await requireAdmin()
  const result = await runPaymentSync()
  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
  return result
}
