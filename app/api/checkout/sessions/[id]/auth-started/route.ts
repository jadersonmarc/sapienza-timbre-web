import { API_BASE } from '@/lib/session'

// auth-started: chamado quando o código de acesso é pedido. Sem autenticação — o anon_token
// no header X-Anon-Token autoriza. Estende a reserva/sessão uma única vez.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const anon = req.headers.get('x-anon-token') || ''
  const res = await fetch(`${API_BASE}/api/v1/public/checkout/sessions/${id}/auth-started`, {
    method: 'POST',
    headers: anon ? { 'X-Anon-Token': anon } : {},
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
