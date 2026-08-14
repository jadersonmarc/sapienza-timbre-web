import { API_BASE } from '@/lib/session'

// Proxy do cadastro público de produtor (landing B2B). Encaminha o IP para o rate-limit.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const fwd = req.headers.get('x-forwarded-for') || ''
  const res = await fetch(`${API_BASE}/api/v1/public/producer-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': fwd },
    body: JSON.stringify(body),
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
