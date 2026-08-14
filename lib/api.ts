// Cliente da API pública do Timbre (lado servidor: SSR/ISR). Só rotas que existem no Go.
// Todos os fetches são tolerantes a falha (retornam vazio/default) para o build/prerender
// não quebrar sem rede e para a página degradar graciosamente se a API estiver fora.
import type { EventCard, PublicConfig, PublicEventDetail } from './types'

export const API_BASE = process.env.TIMBRE_API || 'https://timbre.sapienzalabs.com.br'

// ISR: revalida o diretório/evento. Os dados voláteis (saldo/lote corrente) o cliente
// busca em runtime — o SSR fica cacheável (§4.2).
const REVALIDATE = 60

type SearchParams = {
  q?: string
  category?: string
  city?: string
  from?: string
  to?: string
  page?: number
}

export async function fetchEvents(params: SearchParams = {}): Promise<EventCard[]> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/events?${qs.toString()}`, {
      next: { revalidate: REVALIDATE },
    })
    if (!res.ok) return []
    return (await res.json()).events ?? []
  } catch {
    return []
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

export async function fetchCategories(): Promise<{ slug: string; count: number }[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/categories`, {
      next: { revalidate: REVALIDATE },
    })
    if (!res.ok) return []
    return (await res.json()).categories ?? []
  } catch {
    return []
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
