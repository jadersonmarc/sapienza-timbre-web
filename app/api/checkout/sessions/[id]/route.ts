import { API_BASE } from '@/lib/session'

// Retomada/alteração da sessão (sem autenticação) — exige o anon_token no header
// X-Anon-Token, que identifica a sessão antes do acesso.
async function forward(req: Request, id: string, method: string) {
  const anon = req.headers.get('x-anon-token') || ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (anon) headers['X-Anon-Token'] = anon
  let body: string | undefined
  if (method !== 'GET') body = await req.text()
  const res = await fetch(`${API_BASE}/api/v1/public/checkout/sessions/${id}`, {
    method,
    headers,
    body,
  })
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  return forward(req, id, 'GET')
}
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  return forward(req, id, 'PATCH')
}
