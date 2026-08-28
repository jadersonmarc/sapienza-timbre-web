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
  // Faixa de quantidade por compra. Mín. e máx. iguais a 2 é o "ingresso duplo"; o preço
  // acima é o UNITÁRIO, e o total é preço × quantidade.
  min_purchase_quantity: number
  max_purchase_quantity?: number | null
  // Aviso do produtor para ESTA categoria. Já vem sanitizado do servidor; ainda assim é
  // renderizado como TEXTO — nunca dangerouslySetInnerHTML.
  notice?: string | null
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
  // Linha curta abaixo do título — "turnê de despedida", "com participação de X".
  subtitle?: string
  // Texto do produtor com marcação simples. NUNCA renderizar como HTML: use <RichText>.
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

export type PublicProducer = { id: string; name: string }

export type PublicEventDetail = {
  event: PublicEvent
  // Quem apresenta o evento. O comprador precisa saber de quem está comprando.
  producer: PublicProducer
  lots: PublicLot[]
  current_lot_id?: string
  sectors: PublicSector[]
  // Cota de meia-entrada. A Lei 12.933/2013, art. 1º, §1º obriga a informar a
  // disponibilidade de meia em todos os pontos de venda.
  half_price: { available: boolean; quota: number; granted: number; remaining: number }
}

export type PublicConfig = {
  payment_methods: string[]
  hold_ttl_seconds: number
  // Regras do parcelamento vêm do servidor; a tela só monta as opções que cabem.
  max_installments?: number
  min_installment_cents?: number
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
  // Estado de materialização on-chain. 'not_materialized' é NORMAL e permanente (não
  // mostrar spinner/aviso/badge); 'pending' é transitório (mint em fila).
  chain_status?: string
}

// ── atestado público (verificação) ────────────────────────────────────────────

export type AttestationCategoryCount = { category: string; count: number }
export type AttestationLotSales = { lot_id: string; name: string; sold: number }
export type AttestationSectorSales = { sector_id: string; name: string; sold: number }
export type AttestationCommitment = {
  kind: string
  category?: string
  target_type: string
  target_value: string
  realized: string
  description?: string
}

export type AttestationPayload = {
  format_version: number
  event: { id: string; name: string; starts_at: string; ends_at: string; city: string; producer: string }
  sales: { tickets_sold: number; by_lot: AttestationLotSales[]; by_sector: AttestationSectorSales[] }
  courtesy: { issued: AttestationCategoryCount[]; used: AttestationCategoryCount[] }
  attendance: { present: number; absent: number; rate_pct: number; reentries: number }
  half_price: { granted: number; quota: number }
  commitments: AttestationCommitment[]
}

export type Attestation = {
  id: string
  event_id: string
  version: number
  supersedes_id?: string
  superseded_by?: string
  format_version: number
  key_id: string
  payload: AttestationPayload
  serialization: string
  digest: string
  signature: string
  public_key: string
  anchor: { status: string; tx_hash?: string; anchored_at?: string }
}
