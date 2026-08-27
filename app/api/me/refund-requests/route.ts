import { API_BASE, getSessionToken } from '@/lib/session'

// Pedidos de devolução do comprador, para ele acompanhar sem ligar para a casa.
export async function GET() {
  const token = await getSessionToken()
  if (!token) return Response.json({ error: 'não autenticado' }, { status: 401 })
  const res = await fetch(`${API_BASE}/api/v1/public/me/refund-requests`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
