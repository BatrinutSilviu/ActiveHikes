import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/session'

// Every admin page checks the admin role on the server too — not only in proxy.ts — so the
// admin area stays closed even if a request ever slips past the proxy.
export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  if (!(await getAdminSession())) {
    const { lang } = await params
    redirect(`/${lang}/auth/login?callbackUrl=${encodeURIComponent(`/${lang}/admin`)}`)
  }
  return children
}
