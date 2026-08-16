import { API_BASE, getSessionToken } from '@/lib/session'

// Proxy da reemissão pelo comprador (buyer-authed via cookie).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken()
  if (!token) return Response.json({ error: 'não autenticado' }, { status: 401 })
  const { id } = await ctx.params
  const res = await fetch(`${API_BASE}/api/v1/public/me/tickets/${id}/reissue`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
