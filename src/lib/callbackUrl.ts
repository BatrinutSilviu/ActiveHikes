// Where to send someone after logging in or onboarding: only a page of this site in their language,
// never another site (an open redirect would let a phishing link look like it came from us).
export function resolveCallbackUrl(raw: string | null | undefined, lang: string): string {
  const home = `/${lang}`
  if (!raw || (!raw.startsWith(`${home}/`) && raw !== home) || raw.includes('\\')) return home
  if (raw.startsWith(`${home}/onboarding`) || raw.startsWith(`${home}/auth/`)) return home
  return raw
}
