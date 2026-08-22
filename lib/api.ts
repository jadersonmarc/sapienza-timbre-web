// Cliente da API pública do Timbre (lado servidor: SSR/ISR). Só rotas que existem no Go.
// Todos os fetches são tolerantes a falha (retornam vazio/default) para o build/prerender
// não quebrar sem rede e para a página degradar graciosamente se a API estiver fora.
import type { Attestation, EventCard, PublicConfig, PublicEventDetail, TokenMetadata, TokenState } from './types'

const FALLBACK_API = 'https://timbre-api.sapienzalabs.com.br'

// Configuração quebrada não pode virar "catálogo vazio" em silêncio. Em dev, avisa que
// TIMBRE_API não está definida; o build (Dockerfile) não define a var e roda offline, então
// segue tolerante. Os fetches abaixo distinguem erro de rede/HTTP (error: true) de vazio real.
export const API_BASE = (() => {
  const v = process.env.TIMBRE_API
  if (!v && process.env.NODE_ENV !== 'production') {
    console.warn(`[Timbre] TIMBRE_API não definida — usando fallback ${FALLBACK_API}. Defina em .env.local.`)
  }
  return v || FALLBACK_API
})()

// ISR: revalida o diretório/evento. Os dados voláteis (saldo/lote corrente) o cliente
// busca em runtime — o SSR fica cacheável (§4.2).
const REVALIDATE = 60

// Resultado do catálogo: `error` sinaliza API fora/rede (≠ vazio real), para o UI não
// mascarar falha como "não há eventos".
export type Catalog<T> = { data: T; error: boolean }

type SearchParams = {
  q?: string
  category?: string
  city?: string
  from?: string
  to?: string
  page?: number
}

export async function fetchEvents(params: SearchParams = {}): Promise<Catalog<EventCard[]>> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/events?${qs.toString()}`, {
      next: { revalidate: REVALIDATE },
    })
    if (!res.ok) return { data: [], error: true }
    return { data: (await res.json()).events ?? [], error: false }
  } catch {
    return { data: [], error: true }
  }
}

export async function fetchEvent(id: string): Promise<PublicEventDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/events/${id}`, {
      next: { revalidate: REVALIDATE },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchCategories(): Promise<Catalog<{ slug: string; count: number }[]>> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/categories`, {
      next: { revalidate: REVALIDATE },
    })
    if (!res.ok) return { data: [], error: true }
    return { data: (await res.json()).categories ?? [], error: false }
  } catch {
    return { data: [], error: true }
  }
}

// Prova de propriedade pública (Onda 2): estado + metadados do token. Sem conta.
export async function fetchToken(id: string): Promise<{ state: TokenState } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/tokens/${id}`, { next: { revalidate: 30 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchTokenMetadata(id: string): Promise<TokenMetadata | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/tokens/${id}/metadata`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Atestado público (verificação do fechamento do evento). Sem autenticação.
export async function fetchAttestation(id: string): Promise<Attestation | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/attestations/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchConfig(): Promise<PublicConfig> {
  const fallback: PublicConfig = { payment_methods: ['pix'], hold_ttl_seconds: 600 }
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/config`, { next: { revalidate: REVALIDATE } })
    if (!res.ok) return fallback
    return await res.json()
  } catch {
    return fallback
  }
}
