// Normalizes a user-entered phone number to international digits (no "+"),
// as required by wa.me links. Numbers without a country code are assumed Romanian.
export function toInternationalDigits(phone: string): string | null {
  const trimmed = phone.trim()
  let digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  if (trimmed.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0')) {
    // local Romanian format: 0722 123 456 → 40722123456
    digits = '40' + digits.slice(1)
  } else if (digits.length === 9 && digits.startsWith('7')) {
    // leading 0 omitted: 722 123 456
    digits = '40' + digits
  }

  return digits.length >= 8 ? digits : null
}

export function whatsAppUrl(phone: string): string | null {
  const digits = toInternationalDigits(phone)
  return digits ? `https://wa.me/${digits}` : null
}
