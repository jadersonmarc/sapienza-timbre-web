import { cookies } from 'next/headers'
import { API_BASE } from './api'

// Sessão do PRODUTOR (colaborador) — cookie httpOnly próprio, distinto do comprador.
export const PRODUCER_COOKIE = 'timbre_producer'
export const PRODUCER_MAX_AGE = 60 * 60 * 12 // 12h (casa com o defaultTTL do JWT de produtor)

export { API_BASE }

export async function getProducerToken(): Promise<string | null> {
  const c = await cookies()
  return c.get(PRODUCER_COOKIE)?.value ?? null
}
