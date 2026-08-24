import { cookies } from 'next/headers'
import { API_BASE, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

// Troca a senha com o código do e-mail e já abre a sessão: quem esqueceu a senha não tem
// como entrar depois, e mandar fazer login em seguida só devolveria a pessoa ao problema.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_BASE}/api/v1/public/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (res.ok && data.token) {
    const c = await cookies()
    c.set(SESSION_COOKIE, data.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })
    return Response.json({ ok: true })
  }
  return Response.json({ ok: false, error: data.error ?? 'código inválido ou expirado' }, { status: res.status })
}
