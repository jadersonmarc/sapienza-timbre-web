import { API_BASE, getSessionToken } from '@/lib/session'

// Pay da sessão: cria a ordem/pagamento a partir da reserva. Exige o comprador autenticado.
//
// ATENÇÃO: no cartão transparente este corpo carrega os dados do cartão. Ele é repassado ao
// backend e descartado — NUNCA registrar o corpo em log, telemetria ou mensagem de erro.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = await getSessionToken()
  if (!token) return Response.json({ error: 'não autenticado' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_BASE}/api/v1/public/checkout/sessions/${id}/pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
