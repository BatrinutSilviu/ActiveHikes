'use server'

import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseGasCosts } from '@/lib/gasCosts'

/** Saves the gas costs calculator of a hike (admins). `null` forgets it, so it starts again from the hike's drivers. */
export async function saveGasCosts(hikeId: string, data: unknown): Promise<{ error: string } | { success: true }> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return { error: 'Unauthorized' }
  const value = data === null ? null : parseGasCosts(data)
  if (data !== null && !value) return { error: 'Invalid data' }
  const hike = await prisma.hike.findUnique({ where: { id: hikeId }, select: { id: true } })
  if (!hike) return { error: 'Not found' }
  await prisma.hike.update({ where: { id: hikeId }, data: { gasCosts: value ?? Prisma.DbNull } })
  return { success: true }
}
