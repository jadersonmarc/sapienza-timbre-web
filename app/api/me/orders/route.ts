import { API_BASE, getSessionToken } from '@/lib/session'

// Histórico de pedidos do comprador. Lê o cookie httpOnly e encaminha ao Go.
export async function GET() {
  const token = await getSessionToken()
  if (!token) return Response.json({ error: 'não autenticado' }, { status: 401 })
  const res = await fetch(`${API_BASE}/api/v1/public/me/orders`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
