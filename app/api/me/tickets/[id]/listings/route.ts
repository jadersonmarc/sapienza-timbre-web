import { API_BASE, getSessionToken } from '@/lib/session'

// Proxy do anúncio de revenda pelo comprador (buyer-authed via cookie).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken()
  if (!token) return Response.json({ error: 'não autenticado' }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_BASE}/api/v1/public/me/tickets/${id}/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
