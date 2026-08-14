import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/lib/session'

// Encerra a sessão: apaga o cookie. O cache local do QR (PWA) é limpo no cliente (§4.1).
export async function POST() {
  const c = await cookies()
  c.delete(SESSION_COOKIE)
  return Response.json({ ok: true })
}
