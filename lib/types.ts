// Tipos espelhando os DTOs públicos do backend Go (internal/api/public_catalog.go).
// Nenhum campo de owner/financeiro — a API pública já filtra.

export type EventCard = {
  event_id: string
  title: string
  category?: string
  city?: string
  starts_at?: string
  cover_url?: string
  min_price_cents?: number
}

export type PublicLot = {
  id: string
  name: string
  price_cents: number
  available: number
  starts_at?: string
  ends_at?: string
  sort_order: number
}

export type PublicSeat = {
  id: string
  row_label?: string
  number?: string
  blocked: boolean
}

export type PublicPrice = {
  lot_id: string
  price_cents: number
  half_price_cents?: number
}

export type PublicSector = {
  id: string
  name: string
  kind: 'standing' | 'seated' | 'table'
  prices?: PublicPrice[]
  seats?: PublicSeat[]
}

export type PublicEvent = {
  id: string
  title: string
  description?: string
  category: string
  cover_url?: string
  starts_at?: string
  ends_at?: string
  address?: string
  city?: string
  lat?: number
  lng?: number
  age_rating?: string
  cancellation_policy?: string
  terms?: string
  has_seat_map: boolean
}

export type PublicEventDetail = {
  event: PublicEvent
  lots: PublicLot[]
  current_lot_id?: string
  sectors: PublicSector[]
}

export type PublicConfig = {
  payment_methods: string[]
  hold_ttl_seconds: number
}

export type TokenState = {
  lifecycle: string
  chain: string
  custody: string
  transferable_after?: string
  disputed: boolean
}

export type TokenAttribute = { trait_type?: string; value?: string | number }

export type TokenMetadata = {
  name: string
  description?: string
  attributes?: TokenAttribute[]
}

export type MyTicket = {
  event_id: string
  event_title: string
  event_starts_at?: string
  venue_city?: string
  ticket_id: string
  token?: string
  seat_label?: string
  status: string
}
