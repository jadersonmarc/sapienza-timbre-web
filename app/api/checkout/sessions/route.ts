import { API_BASE } from '@/lib/session'

// Criação da sessão de checkout (sem autenticação): encaminha a seleção ao Go, que reserva
// lote/assentos e devolve a sessão com anon_token. Encaminha o IP real para o rate-limit.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const fwd = req.headers.get('x-forwarded-for') || ''
  const res = await fetch(`${API_BASE}/api/v1/public/checkout/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': fwd },
    body: JSON.stringify(body),
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
