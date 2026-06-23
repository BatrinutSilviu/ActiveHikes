import { redirect } from 'next/navigation'

export default function LoginRedirect() {
  redirect('/ro/auth/login')
}
