import crypto from 'crypto'

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
  return { rawToken, hashedToken }
}

export function hashResetToken(rawToken: string) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}
