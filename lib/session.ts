import { cookies } from 'next/headers'
import { API_BASE } from './api'

// Cookie da sessão do comprador — httpOnly (não legível por JS), Secure, SameSite.
export const SESSION_COOKIE = 'timbre_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 // 24h, casando com o buyerTTL do backend

export { API_BASE }

export async function getSessionToken(): Promise<string | null> {
  const c = await cookies()
  return c.get(SESSION_COOKIE)?.value ?? null
}
