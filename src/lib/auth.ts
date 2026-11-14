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
            // Google vouches for the address (checked in the signIn callback), so a Google sign-in
            // joins an existing account with the same email instead of being refused.
            allowDangerousEmailAccountLinking: true,
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
        if (!await allow(`login:email:${email}`, 10, 15 * 60_000) || !await allow(`login:ip:${ip}`, 30, 15 * 60_000)) {
          throw new Error('TooManyAttempts')
        }

        // Older accounts may have been saved with capitals in their email.
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        })

        if (!user || !user.password) return null

        const match = await bcrypt.compare(credentials.password, user.password)
        if (!match) return null
        // Only after the password matched, so this doesn't reveal which addresses are registered.
        if (!user.emailVerified) throw new Error('EmailNotVerified')

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
    async signIn({ account, profile }) {
      // Only addresses Google has verified may sign in (and possibly join an existing account).
      if (account?.provider === 'google') return (profile as { email_verified?: boolean } | undefined)?.email_verified === true
      return true
    },
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
    // Populate name for Google OAuth users on first sign-in. (next-auth also calls this when Google
    // joins an existing account, so it must not touch anything else.)
    async createUser({ user }) {
      if (user.name && user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { name: user.name },
        })
      }
    },
    // A Google login was just attached to an account with the same (Google-verified) email: a new
    // account, or an existing one. If that email was never confirmed, whoever set the password never
    // proved they own the address — possibly someone who signed up with another person's email
    // first. The Google owner has proved it, so the password goes, the email counts as confirmed, and
    // the phone typed at sign-up is dropped so onboarding asks the real owner for theirs.
    async linkAccount({ user, profile }) {
      if (!user.id || !user.email || profile.email?.toLowerCase() !== user.email.toLowerCase()) return
      await prisma.user.updateMany({
        where: { id: user.id, emailVerified: null },
        data: {
          password: null,
          emailVerified: new Date(),
          phone: null,
          ...(profile.name ? { name: profile.name } : {}),
        },
      })
    },
  },
}
