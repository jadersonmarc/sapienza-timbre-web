import { cookies } from 'next/headers'
import { API_BASE, PRODUCER_COOKIE, PRODUCER_MAX_AGE } from '@/lib/producer-session'

// Login do produtor: valida no Go e grava a sessão em cookie httpOnly (token nunca no JS).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (res.ok && data.token) {
    const c = await cookies()
    c.set(PRODUCER_COOKIE, data.token, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: PRODUCER_MAX_AGE,
    })
    return Response.json({ ok: true })
  }
  return Response.json({ ok: false }, { status: 401 })
}
