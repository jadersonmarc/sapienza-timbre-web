import { cookies } from 'next/headers'
import { API_BASE, ADMIN_COOKIE, ADMIN_MAX_AGE } from '@/lib/admin-session'

// Login do admin: valida no Go (POST /api/v1/admin/login) e grava o JWT em cookie httpOnly
// (token nunca exposto ao JS). O papel (admin/super_admin) fica nas claims do token.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_BASE}/api/v1/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (res.ok && data.token) {
    const c = await cookies()
    c.set(ADMIN_COOKIE, data.token, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: ADMIN_MAX_AGE,
    })
    return Response.json({ ok: true })
  }
  return Response.json({ ok: false }, { status: 401 })
}
