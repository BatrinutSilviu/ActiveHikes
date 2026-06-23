'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'

export async function createBankAccount(data: {
  bankName: string
  accountHolder: string
  iban: string
  currency: string
  notes?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  await prisma.bankAccount.create({ data: { ...data, isActive: true } })
  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
}

export async function toggleBankAccount(id: string, isActive: boolean) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  await prisma.bankAccount.update({ where: { id }, data: { isActive } })
  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
}

export async function deleteBankAccount(id: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  await prisma.bankAccount.delete({ where: { id } })
  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
}
