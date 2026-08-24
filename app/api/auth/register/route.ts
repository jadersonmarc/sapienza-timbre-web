import { cookies } from 'next/headers'
import { API_BASE, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

// Cria a conta no Go e já deixa a pessoa dentro: o cadastro acontece no meio de uma
// compra, e obrigar a entrar de novo logo depois perderia a reserva. O token vai para
// cookie httpOnly — nunca chega ao JS da página.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_BASE}/api/v1/public/auth/register`, {
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
  // O motivo importa aqui (e-mail já cadastrado, CPF inválido): é o que a tela mostra.
  return Response.json({ ok: false, error: data.error ?? 'não foi possível criar a conta' }, { status: res.status })
}
