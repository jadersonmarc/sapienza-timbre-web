import { API_BASE } from '@/lib/session'

// Política de devolução do evento: o que a casa promete. Pública — é informação de venda, e
// o comprador precisa ler ANTES de comprar e antes de pedir.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const res = await fetch(`${API_BASE}/api/v1/public/events/${id}/refund-policy`, {
    cache: 'no-store',
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
