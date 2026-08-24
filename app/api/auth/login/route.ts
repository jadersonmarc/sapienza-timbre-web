import { cookies } from 'next/headers'
import { API_BASE, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

// Entrada por e-mail e senha. A resposta do Go não distingue e-mail inexistente de senha
// errada, e a tela repete essa indistinção — dizer qual dos dois falhou entregaria quem
// tem cadastro.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_BASE}/api/v1/public/auth/login`, {
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
  return Response.json({ ok: false, error: 'e-mail ou senha inválidos' }, { status: 401 })
}
