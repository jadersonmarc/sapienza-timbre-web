import { API_BASE, getSessionToken } from '@/lib/session'

// Sessão do comprador: lê o cookie httpOnly e encaminha ao Go (GET /public/me). O checkout
// usa para decidir entre "entre para comprar" e o formulário de compra.
export async function GET() {
  const token = await getSessionToken()
  if (!token) return Response.json({ authed: false }, { status: 401 })
  const res = await fetch(`${API_BASE}/api/v1/public/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
