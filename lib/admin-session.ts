import { cookies } from 'next/headers'
import { API_BASE } from './api'

// Sessão do ADMIN de plataforma (painel /admin) — cookie httpOnly próprio, distinto do
// comprador e do produtor. Casa com o adminTTL do JWT de admin (12h).
export const ADMIN_COOKIE = 'timbre_admin'
export const ADMIN_MAX_AGE = 60 * 60 * 12

export { API_BASE }

export async function getAdminToken(): Promise<string | null> {
  const c = await cookies()
  return c.get(ADMIN_COOKIE)?.value ?? null
}
