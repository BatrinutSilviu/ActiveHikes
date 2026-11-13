import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { allow, clientIp, normalizeEmail } from './rateLimit'

// How often a signed-in user's role and phone are re-read from the database, so a removed admin
// right or a deleted account takes effect within minutes, not when the session expires.
const REFRESH_MS = 5 * 60_000

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30, // 30 days, renewed while the user keeps visiting
    updateAge: 60 * 60 * 24, // renew the session cookie at most once a day
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const email = normalizeEmail(credentials?.email)
        if (!email || !credentials?.password) return null
        // Slow down password guessing: per account and per client.
        const ip = clientIp(req?.headers)
        if (!allow(`login:email:${email}`, 10, 15 * 60_000) || !allow(`login:ip:${ip}`, 30, 15 * 60_000)) {
          throw new Error('TooManyAttempts')
        }

        // Older accounts may have been saved with capitals in their email.
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        })

        if (!user || !user.password) return null

        const match = await bcrypt.compare(credentials.password, user.password)
        if (!match) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) token.id = user.id
      // Role and phone always come from the database: on sign-in, when the client asks for an update
      // (e.g. right after onboarding, so proxy.ts sees the phone) and every few minutes otherwise.
      const stale = !token.refreshedAt || Date.now() - token.refreshedAt > REFRESH_MS
      if (user || trigger === 'update' || stale) {
        const dbUser = token.id
          ? await prisma.user.findUnique({ where: { id: token.id }, select: { role: true, phone: true } })
          : null
        // A deleted account keeps no rights.
        token.role = dbUser?.role ?? 'user'
        token.phone = dbUser?.phone ?? null
        token.refreshedAt = Date.now()
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.phone = token.phone ?? null
      }
      return session
    },
  },
  events: {
    // Populate name for Google OAuth users on first sign-in
    async createUser({ user }) {
      if (user.name && user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { name: user.name },
        })
      }
    },
  },
}
