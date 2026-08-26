'use client'

// Cliente do painel ADMINISTRATIVO (/admin): fala com as rotas same-origin /api/admin/*
// (proxy autenticado por cookie httpOnly). O Go aplica auth/roles por rota — o admin só
// faz o que o papel dele permite (admin vs super_admin).

async function j(res: Response) {
  return res.json().catch(() => ({}))
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return res.ok
}

export async function adminLogout() {
  await fetch('/api/admin/logout', { method: 'POST' })
}

// Chamadas autenticadas ao Go via proxy. `path` é o caminho após /api/v1/admin/.
export async function aget(path: string) {
  const res = await fetch(`/api/admin/${path}`)
  return { ok: res.ok, status: res.status, data: await j(res) }
}
export async function asend(method: string, path: string, body?: unknown) {
  const res = await fetch(`/api/admin/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, data: await j(res) }
}
export const apost = (path: string, body?: unknown) => asend('POST', path, body)
export const apatch = (path: string, body?: unknown) => asend('PATCH', path, body)
export const aput = (path: string, body?: unknown) => asend('PUT', path, body)
