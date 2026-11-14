import { Resend } from 'resend'
import { logger } from '@/lib/logger'

// Lazy — RESEND_API_KEY is a runtime secret, not available during `next build`,
// and the Resend constructor throws immediately if it's missing.
let resend: Resend | null = null
function getResendClient() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  // Resend reports API failures (bad key, rate limit, …) in `error` instead of throwing.
  const { data, error } = await getResendClient().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: 'Reset your ActiveHikes password',
    html: `
      <p>Someone requested a password reset for this email address on ActiveHikes.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  })
  if (error) throw new Error(`Resend: ${error.name}: ${error.message}`)
  logger.info('email sent', { job: 'email', kind: 'password-reset', emailId: data?.id })
}

export async function sendEmailConfirmation(to: string, confirmUrl: string, lang: 'en' | 'ro') {
  const ro = lang === 'ro'
  const { data, error } = await getResendClient().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: ro ? 'Confirmă-ți adresa de email pentru ActiveHikes' : 'Confirm your ActiveHikes email address',
    html: ro
      ? `
      <p>Cineva și-a creat un cont ActiveHikes cu această adresă de email.</p>
      <p><a href="${confirmUrl}">Apasă aici pentru a confirma adresa</a>. Linkul expiră în 24 de ore.</p>
      <p>Dacă nu ai fost tu, poți ignora acest email.</p>
    `
      : `
      <p>Someone created an ActiveHikes account with this email address.</p>
      <p><a href="${confirmUrl}">Click here to confirm your address</a>. This link expires in 24 hours.</p>
      <p>If it wasn't you, you can ignore this email.</p>
    `,
  })
  if (error) throw new Error(`Resend: ${error.name}: ${error.message}`)
  logger.info('email sent', { job: 'email', kind: 'email-confirmation', emailId: data?.id })
}
