import { API_BASE } from '@/lib/session'

// Proxy do status do pedido (espera ativa do Pix).
export async function GET(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params
  const res = await fetch(`${API_BASE}/api/v1/public/checkout/${orderId}/status`, {
    cache: 'no-store',
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
