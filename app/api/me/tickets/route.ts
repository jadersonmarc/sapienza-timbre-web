import { API_BASE, getSessionToken } from '@/lib/session'

// Meus ingressos: lê o cookie httpOnly e encaminha como Bearer ao Go (escopado ao subject).
export async function GET() {
  const token = await getSessionToken()
  if (!token) return Response.json({ tickets: [] }, { status: 401 })
  const res = await fetch(`${API_BASE}/api/v1/public/me/tickets`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
