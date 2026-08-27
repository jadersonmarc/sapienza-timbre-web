import { API_BASE, getSessionToken } from '@/lib/session'

// Pedido de devolução do comprador. A trilha (direito na janela × liberalidade fora dela)
// é decidida no Go pela política do evento — o navegador não escolhe caminho.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = await getSessionToken()
  if (!token) return Response.json({ error: 'não autenticado' }, { status: 401 })
  const { id } = await ctx.params
  const res = await fetch(`${API_BASE}/api/v1/public/me/orders/${id}/refund-request`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: await req.text(),
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
