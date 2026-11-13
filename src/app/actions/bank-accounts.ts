'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'
import { requireAdmin } from '@/lib/session'

export async function createBankAccount(data: {
  type: 'bank' | 'revolut' | 'btpay'
  bankName?: string
  accountHolder: string
  iban?: string
  paymentHandle?: string
  currency: string
  notes?: string
}) {
  await requireAdmin()

  await prisma.bankAccount.create({
    data: {
      type: data.type,
      bankName: data.type === 'bank' ? data.bankName || null : null,
      accountHolder: data.accountHolder,
      iban: data.type === 'bank' ? data.iban || null : null,
      paymentHandle: data.type !== 'bank' ? data.paymentHandle || null : null,
      currency: data.currency,
      notes: data.notes || null,
      isActive: true,
    },
  })
  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
}

export async function toggleBankAccount(id: string, isActive: boolean) {
  await requireAdmin()

  await prisma.bankAccount.update({ where: { id }, data: { isActive } })
  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
}

export async function deleteBankAccount(id: string) {
  await requireAdmin()

  await prisma.bankAccount.delete({ where: { id } })
  revalidateLocalePaths('/admin/bank-accounts', revalidatePath)
}

// The active payment methods, for picking which ones a new event shows.
export async function listActivePaymentMethods() {
  await requireAdmin()
  return prisma.bankAccount.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, type: true, bankName: true, accountHolder: true, iban: true, paymentHandle: true },
  })
}
