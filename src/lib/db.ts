import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createClient() {
  if (process.env.NODE_ENV === 'development') return new PrismaClient({ log: ['error', 'warn'] })
  // In production Prisma's errors (e.g. lost DB connections) go through the JSON logger as one line each.
  const client = new PrismaClient({ log: [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }] })
  client.$on('error', e => logger.error('prisma error', { target: e.target, message: e.message }))
  client.$on('warn', e => logger.warn('prisma warning', { target: e.target, message: e.message }))
  return client as unknown as PrismaClient
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
