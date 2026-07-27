'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { ViaFerrataStatus } from '@prisma/client'
import { revalidateLocalePaths } from '@/lib/i18n'
import { PAYMENT_WINDOW_MS } from '@/lib/expireParticipants'
import { revalidateViaFerrataParticipantCountPaths } from '@/lib/revalidateViaFerrata'

export async function joinViaFerrata(
  viaFerrataId: string,
  friendName?: string,
  agreedToTerms?: boolean,
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const trimmedFriendName = friendName?.trim() || null

  await prisma.$transaction(async (tx) => {
    // Lock the via ferrata row so concurrent joins are serialized
    const events = await tx.$queryRaw<{ maxParticipants: number }[]>`
      SELECT "maxParticipants" FROM "ViaFerrata" WHERE id = ${viaFerrataId} FOR UPDATE
    `
    if (!events.length) throw new Error('Via Ferrata event not found')

    const confirmed = await tx.viaFerrataParticipant.count({
      where: { viaFerrataId, status: 'confirmed' },
    })

    const neededSpots = trimmedFriendName ? 2 : 1
    const isAdmin = session.user.role === 'admin'
    const isFull = confirmed + neededSpots > events[0].maxParticipants
    const status = isAdmin ? 'confirmed' : isFull ? 'waitlist' : 'pending'
    const confirmedAt = isAdmin ? new Date() : undefined
    const paymentDeadline = status === 'pending' ? new Date(Date.now() + PAYMENT_WINDOW_MS) : null

    const host = await tx.viaFerrataParticipant.create({
      data: {
        viaFerrataId,
        userId: session.user.id,
        status,
        confirmedAt,
        paymentDeadline,
        agreedToTermsAt: agreedToTerms ? new Date() : null,
      },
    })

    if (trimmedFriendName) {
      await tx.viaFerrataParticipant.create({
        data: {
          viaFerrataId,
          userId: null,
          status,
          confirmedAt,
          paymentDeadline,
          friendName: trimmedFriendName,
          hostParticipantId: host.id,
        },
      })
    }
  })

  revalidateViaFerrataParticipantCountPaths(viaFerrataId)
}

export async function cancelViaFerrataRegistration(viaFerrataId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Not authenticated')

  const participation = await prisma.viaFerrataParticipant.findUnique({
    where: { viaFerrataId_userId: { viaFerrataId, userId: session.user.id } },
    select: { id: true, status: true },
  })

  if (!participation) throw new Error('Registration not found')
  if (participation.status === 'confirmed') throw new Error('Confirmed registrations cannot be cancelled')

  await prisma.viaFerrataParticipant.delete({ where: { id: participation.id } })

  revalidateViaFerrataParticipantCountPaths(viaFerrataId)
}

export async function createViaFerrata(data: {
  title: string
  location: string
  description?: string
  date: string
  price: number
  maxParticipants: number
  durationHours?: number
  routes?: string[]
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const viaFerrata = await prisma.viaFerrata.create({
    data: {
      title: data.title,
      location: data.location,
      description: data.description || null,
      date: new Date(data.date),
      price: data.price,
      maxParticipants: data.maxParticipants,
      durationHours: data.durationHours ?? null,
      routes: data.routes ?? [],
      status: 'upcoming',
      createdById: session.user.id,
    },
  })

  return viaFerrata.id
}

export async function updateViaFerrata(
  viaFerrataId: string,
  data: {
    title?: string
    location?: string
    description?: string | null
    date?: string
    price?: number
    maxParticipants?: number
    durationHours?: number | null
    routes?: string[]
    status?: ViaFerrataStatus
  }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') throw new Error('Unauthorized')

  const { date, ...rest } = data
  await prisma.viaFerrata.update({
    where: { id: viaFerrataId },
    data: {
      ...rest,
      ...(date ? { date: new Date(date) } : {}),
    },
  })

  revalidateLocalePaths(`/admin/via-ferrata/${viaFerrataId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${viaFerrataId}`, revalidatePath)
}
