import { cookies } from 'next/headers'
import { API_BASE, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

// Verifica o OTP no Go e, no sucesso, grava a sessão em cookie httpOnly (o token nunca
// chega ao JS). O vínculo convidado→conta acontece no Go, só após esta verificação.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_BASE}/api/v1/public/auth/verify`, {
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
  return Response.json({ ok: false }, { status: res.status === 200 ? 401 : res.status })
}
