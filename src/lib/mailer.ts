import { Resend } from 'resend'

// Lazy — RESEND_API_KEY is a runtime secret, not available during `next build`,
// and the Resend constructor throws immediately if it's missing.
let resend: Resend | null = null
function getResendClient() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await getResendClient().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: 'Reset your ActiveHikes password',
    html: `
      <p>Someone requested a password reset for this email address on ActiveHikes.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  })
}
