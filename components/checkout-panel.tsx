'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, Ticket, TriangleAlert, BadgePercent } from 'lucide-react'
import type { PublicConfig, PublicEventDetail } from '@/lib/types'
import { brl } from '@/lib/format'
import { startCheckout, fetchOccupancy, fetchBuyerSession, quote, type CheckoutBody, type Breakdown } from '@/lib/client'
import { SeatMap } from './seat-map'
import { PixWait } from './pix-wait'
import { CardWait } from './card-wait'
import { HoldTimer } from './hold-timer'
import { BuyerLogin } from './buyer-login'
import { Button } from './ui/button'

type Phase = 'form' | 'pix' | 'done' | 'error'

export function CheckoutPanel({ detail, config }: { detail: PublicEventDetail; config: PublicConfig }) {
  // O backend devolve [] (nunca null), mas ser defensivo aqui evita crash de SSR se um
  // evento não tiver setor/lote em algum caminho legado.
  const lots = detail.lots ?? []
  const sectors = detail.sectors ?? []
  const currentLot = useMemo(
    () => lots.find((l) => l.id === detail.current_lot_id) ?? null,
    [lots, detail.current_lot_id],
  )
  const seated = detail.event.has_seat_map || sectors.some((s) => s.kind !== 'standing' && (s.seats?.length ?? 0) > 0)

  const seatSector = useMemo(() => {
    const m = new Map<string, string>() // seatId -> sectorId
    for (const s of sectors) for (const seat of s.seats ?? []) m.set(seat.id, s.id)
    return m
  }, [sectors])

  const priceForSeat = useCallback(
    (seatId: string): number => {
      if (!currentLot) return 0
      const sectorId = seatSector.get(seatId)
      const sector = sectors.find((s) => s.id === sectorId)
      const rule = sector?.prices?.find((p) => p.lot_id === currentLot.id)
      return rule?.price_cents ?? currentLot.price_cents
    },
    [currentLot, seatSector, sectors],
  )

  const [quantity, setQuantity] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [halfQty, setHalfQty] = useState(0)
  const [coupon, setCoupon] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [method, setMethod] = useState(config.payment_methods[0] ?? 'pix')
  const [occupied, setOccupied] = useState<Set<string>>(new Set())
  const [phase, setPhase] = useState<Phase>('form')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<{ id: string; pix?: string }>()
  const [bd, setBd] = useState<Breakdown | null>(null)
  const [quoteState, setQuoteState] = useState<'idle' | 'ok' | 'error'>('idle')
  const [authed, setAuthed] = useState<boolean | null>(null)

  // Compra exige cadastro: descobre a sessão do comprador. O e-mail vem da conta.
  useEffect(() => {
    fetchBuyerSession().then((s) => {
      setAuthed(s.authed)
      if (s.email) setEmail(s.email)
    })
  }, [])

  // Ocupação viva (seated): busca ao montar e atualiza periodicamente (volátil §4.2).
  useEffect(() => {
    if (!seated) return
    let alive = true
    const load = () => fetchOccupancy(detail.event.id).then((s) => alive && setOccupied(s))
    load()
    const id = setInterval(load, 15000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [seated, detail.event.id])

  const qty = seated ? selected.size : quantity
  const total = useMemo(() => {
    if (!currentLot) return 0
    if (!seated) {
      const full = quantity - Math.min(halfQty, quantity)
      return full * currentLot.price_cents + Math.min(halfQty, quantity) * Math.floor(currentLot.price_cents / 2)
    }
    let sum = 0
    let half = halfQty
    for (const id of selected) {
      const p = priceForSeat(id)
      if (half > 0) {
        sum += Math.floor(p / 2)
        half--
      } else sum += p
    }
    return sum
  }, [seated, quantity, halfQty, selected, currentLot, priceForSeat])

  const toggleSeat = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // Cotação: decomposição face + conveniência, recalculada quando muda seleção/método/
  // cupom/meia (§4.3). Debounce para não bater a API a cada tecla.
  useEffect(() => {
    if (qty < 1) {
      setBd(null)
      setQuoteState('idle')
      return
    }
    const body: CheckoutBody = {
      event_id: detail.event.id,
      quantity: qty,
      method,
      half_price_qty: halfQty || undefined,
      coupon_code: coupon || undefined,
      seat_ids: seated ? [...selected] : undefined,
    }
    const id = setTimeout(() => {
      quote(body).then(({ ok, breakdown }) => {
        setBd(breakdown)
        setQuoteState(ok ? 'ok' : 'error')
      })
    }, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty, method, halfQty, coupon, seated, detail.event.id, [...selected].join(',')])

  // Cupom: feedback explícito (aplicado/inválido) em vez de falha silenciosa (§4.3).
  const couponMsg = !coupon.trim()
    ? null
    : quoteState === 'idle'
      ? null
      : quoteState === 'ok'
        ? { tone: 'ok' as const, text: 'Cupom aplicado.' }
        : { tone: 'error' as const, text: 'Cupom inválido ou expirado.' }
  const quoteError = quoteState === 'error' && !coupon.trim()

  const soldOut = !currentLot || (currentLot?.available ?? 0) <= 0
  const available = currentLot?.available ?? 0

  async function submit() {
    setError('')
    if (qty < 1) {
      setError(seated ? 'Selecione ao menos um assento.' : 'Escolha a quantidade.')
      return
    }
    setBusy(true)
    const body: CheckoutBody = {
      event_id: detail.event.id,
      quantity: qty,
      method,
      buyer_name: name,
      buyer_cpf: cpf || undefined,
      half_price_qty: halfQty || undefined,
      coupon_code: coupon || undefined,
      seat_ids: seated ? [...selected] : undefined,
    }
    const { ok, status, data } = await startCheckout(body)
    setBusy(false)
    if (!ok) {
      if (status === 409 && seated) {
        setError('Um dos assentos acabou de ser ocupado. Atualizamos o mapa — escolha outro.')
        setSelected(new Set())
        fetchOccupancy(detail.event.id).then(setOccupied)
      } else {
        setError('Não foi possível iniciar a compra. Tente novamente.')
      }
      return
    }
    setOrder({ id: data.order_id, pix: data.pix_code })
    setPhase('pix')
  }

  // ── cadastro obrigatório ──
  if (authed === null) {
    return <Panel><p className="text-muted-foreground">Carregando…</p></Panel>
  }
  if (!authed) {
    return <Panel><BuyerLogin onAuthed={() => setAuthed(true)} /></Panel>
  }

  // ── esgotado ──
  if (soldOut) {
    return (
      <Panel>
        <p className="flex items-center gap-2 font-medium">
          <TriangleAlert className="size-5 text-signal" /> Esgotado
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Este evento está sem ingressos no momento. Entre na lista de espera e avisamos assim que abrir novo lote.
        </p>
        <Link href={`/eventos/${detail.event.id}/lista-de-espera`} className="mt-4 block">
          <Button className="w-full">Entrar na lista de espera</Button>
        </Link>
      </Panel>
    )
  }

  // ── pagamento (Pix) ──
  if (phase === 'pix' && order?.pix) {
    return (
      <Panel>
        <HoldTimer seconds={config.hold_ttl_seconds} />
        <PixWait orderId={order.id} pixCode={order.pix} onPaid={() => setPhase('done')} />
      </Panel>
    )
  }
  if (phase === 'pix' && order && !order.pix) {
    // Cartão (sem Pix code): o gateway confirma pelo webhook; acompanhamos pelo status.
    return (
      <Panel>
        <HoldTimer seconds={config.hold_ttl_seconds} />
        <CardWait orderId={order.id} onPaid={() => setPhase('done')} />
      </Panel>
    )
  }

  // ── confirmado ──
  if (phase === 'done') {
    return (
      <Panel>
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Ticket className="size-6" />
          </div>
          <p className="mt-3 font-display text-lg font-semibold">Pagamento confirmado!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enviamos seu ingresso para {email}. Acesse abaixo — funciona até sem sinal.
          </p>
          <Link href="/conta" className="mt-4 block">
            <Button className="w-full">Ver meus ingressos</Button>
          </Link>
        </div>
      </Panel>
    )
  }

  // ── formulário ──
  return (
    <Panel>
      <div className="flex items-baseline justify-between">
        <p className="font-display text-lg font-semibold">Ingressos</p>
        {currentLot && (
          <span className="text-xs text-muted-foreground">
            {currentLot.name} · {available} disponíveis
          </span>
        )}
      </div>

      {seated ? (
        <div className="mt-4">
          <SeatMap sectors={sectors} occupied={occupied} selected={selected} onToggle={toggleSeat} />
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm">Quantidade</span>
          <div className="flex items-center gap-3">
            <button aria-label="Diminuir" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex size-9 items-center justify-center rounded-md border border-border">
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center font-medium">{quantity}</span>
            <button aria-label="Aumentar" onClick={() => setQuantity((q) => Math.min(available, q + 1))} className="flex size-9 items-center justify-center rounded-md border border-border">
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Meia-entrada (exigência explicada ANTES — §4.3). */}
      {qty > 0 && (
        <label className="mt-3 block text-sm">
          <span className="text-muted-foreground">Meia-entrada (quantidade)</span>
          <input
            type="number"
            min={0}
            max={qty}
            value={halfQty}
            onChange={(e) => setHalfQty(Math.max(0, Math.min(qty, parseInt(e.target.value) || 0)))}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Você precisará apresentar o documento comprobatório na entrada.
          </span>
        </label>
      )}

      <label className="mt-3 block">
        <span className="mb-1 block text-sm text-muted-foreground">Cupom (opcional)</span>
        <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Ex.: TIMBRE10"
          className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm" />
        {couponMsg && (
          <span className={`mt-1 flex items-center gap-1 text-xs ${couponMsg.tone === 'ok' ? 'text-primary' : 'text-destructive'}`}>
            <BadgePercent className="size-3.5" /> {couponMsg.text}
          </span>
        )}
      </label>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-muted-foreground">Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome"
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted-foreground">CPF (para meia/nota)</span>
          <input value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00"
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm" />
        </label>
      </div>

      {/* Método (§3.11 — só o que o gateway aceita). */}
      <div className="mt-4 flex gap-2">
        {config.payment_methods.map((m) => (
          <button key={m} onClick={() => setMethod(m)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${method === m ? 'border-primary bg-primary/10' : 'border-border'}`}>
            {m === 'pix' ? 'Pix' : 'Cartão'}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      )}

      {/* Decomposição visível ANTES de confirmar (§4.3) — recalcula ao trocar o método. */}
      <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Ingresso{qty > 1 ? ` (${qty}×)` : ''}</span>
          <span>{brl(bd ? bd.face_cents : total)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Taxa de conveniência</span>
          <span>{brl(bd ? bd.convenience_fee_cents : 0)}</span>
        </div>
        <div className="flex items-baseline justify-between pt-1">
          <span className="font-medium">Total</span>
          <span className="font-display text-xl font-bold">{brl(bd ? bd.total_cents : total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">A taxa de conveniência varia conforme o meio de pagamento.</p>
        {quoteError && (
          <p className="text-xs text-signal">
            Não conseguimos calcular as taxas agora — o valor final pode mudar no fechamento.
          </p>
        )}
      </div>
      <Button size="lg" className="mt-3 w-full" disabled={busy || qty < 1} onClick={submit}>
        {busy ? 'Processando…' : 'Comprar'}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {email ? `Comprando como ${email}.` : 'Sua conta é criada na hora, sem senha.'}
      </p>
    </Panel>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-5">{children}</div>
}

// Máscara de CPF (000.000.000-00) — melhora a legibilidade e reduz erro de digitação.
function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
