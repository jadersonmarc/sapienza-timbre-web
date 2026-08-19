'use client'

// Cliente do painel do produtor: fala com as rotas same-origin /api/producer/* (proxy
// autenticado por cookie). Nenhuma rota do Go é chamada direto do navegador.

async function j(res: Response) {
  return res.json().catch(() => ({}))
}

export async function producerLogin(email: string, password: string) {
  const res = await fetch('/api/producer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return res.ok
}

export async function producerLogout() {
  await fetch('/api/producer/logout', { method: 'POST' })
}

// Chamadas autenticadas ao Go via proxy. `path` é o caminho após /api/v1/.
export async function pget(path: string) {
  const res = await fetch(`/api/producer/${path}`)
  return { ok: res.ok, status: res.status, data: await j(res) }
}
export async function psend(method: string, path: string, body?: unknown) {
  const res = await fetch(`/api/producer/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, data: await j(res) }
}
export const ppost = (path: string, body?: unknown) => psend('POST', path, body)
export const ppatch = (path: string, body?: unknown) => psend('PATCH', path, body)
