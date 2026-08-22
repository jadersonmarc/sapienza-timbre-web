import { API_BASE, getSessionToken } from '@/lib/session'

// Bind da sessão ao comprador autenticado: encaminha a sessão do comprador como Bearer.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = await getSessionToken()
  if (!token) return Response.json({ error: 'não autenticado' }, { status: 401 })
  const res = await fetch(`${API_BASE}/api/v1/public/checkout/sessions/${id}/bind`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
