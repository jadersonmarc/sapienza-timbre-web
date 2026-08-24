'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, Ticket, TriangleAlert, BadgePercent } from 'lucide-react'
import type { PublicConfig, PublicEventDetail } from '@/lib/types'
import { brl } from '@/lib/format'
import { createSession, bindSession, paySession, authStarted, fetchOccupancy, fetchBuyerSession, quote, type CheckoutBody, type Breakdown, type Attendee } from '@/lib/client'
import { SeatMap } from './seat-map'
import { PixWait } from './pix-wait'
import { CardWait } from './card-wait'
import { HoldTimer } from './hold-timer'
import { BuyerAccountForm } from './buyer-account-form'
import { AttendeeForm } from './attendee-form'
import { Button } from './ui/button'

// As etapas seguem a ordem comercial: escolher, se identificar, dizer quem vai, pagar.
// 'card' existe porque o cartão é pago no ambiente do gateway, e a tela precisa continuar
// aqui esperando a confirmação.
type Phase = 'form' | 'account' | 'attendees' | 'pix' | 'card' | 'done'

const STEPS: { key: Phase; label: string }[] = [
  { key: 'form', label: 'Ingressos' },
  { key: 'account', label: 'Seus dados' },
  { key: 'attendees', label: 'Participantes' },
  { key: 'pix', label: 'Pagamento' },
]

export function CheckoutPanel({ detail, config }: { detail: PublicEventDetail; config: PublicConfig }) {
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
  const [cpf, setCpf] = useState('')
  const [method, setMethod] = useState(config.payment_methods[0] ?? 'pix')
  const [occupied, setOccupied] = useState<Set<string>>(new Set())
  const [phase, setPhase] = useState<Phase>('form')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<{ id: string; pix?: string }>()
  const [bd, setBd] = useState<Breakdown | null>(null)
  const [quoteState, setQuoteState] = useState<'idle' | 'ok' | 'error'>('idle')
  const [sessionId, setSessionId] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerHasCpf, setBuyerHasCpf] = useState(false)
  const [buyerName, setBuyerName] = useState('')
  const [buyerCpf, setBuyerCpf] = useState('')
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [invoiceURL, setInvoiceURL] = useState('')

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

  // Cotação (sem reserva): recalculada quando muda seleção/método/cupom/meia (§4.3).
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

  // Reseta para o formulário, liberando a sessão/reserva (refazer a seleção).
  function backToForm(msg: string) {
    setSessionId('')
    setCpf('')
    setPhase('form')
    setError(msg)
  }

  // Cria a sessão (reserva a seleção) e desvia para a conta no momento de pagar.
  async function goToPayment() {
    setError('')
    if (qty < 1) {
      setError(seated ? 'Selecione ao menos um assento.' : 'Escolha a quantidade.')
      return
    }
    setBusy(true)
    const { ok, status, data } = await createSession({
      event_id: detail.event.id,
      quantity: qty,
      seat_ids: seated ? [...selected] : undefined,
      half_price_qty: halfQty || undefined,
      coupon_code: coupon || undefined,
    })
    setBusy(false)
    if (!ok) {
      if (status === 409 && seated) {
        setError('Um dos assentos acabou de ser ocupado. Atualizamos o mapa — escolha outro.')
        setSelected(new Set())
        fetchOccupancy(detail.event.id).then(setOccupied)
      } else {
        setError('Não foi possível reservar agora. Tente novamente.')
      }
      return
    }
    setSessionId(data.id)
    // A sessão pode ter sido retomada com a ficha já preenchida (recarregou a página no
    // meio): reidrata em vez de fazer a pessoa digitar tudo de novo.
    const savedAttendees = data?.items?.attendees
    if (Array.isArray(savedAttendees) && savedAttendees.length) setAttendees(savedAttendees)
    await loadBuyer()
  }

  // loadBuyer decide a próxima etapa pelo estado da conta: sem conta, cadastro; com conta,
  // as fichas dos participantes.
  async function loadBuyer() {
    const sess = await fetchBuyerSession()
    if (sess.email) setBuyerEmail(sess.email)
    if (sess.name) setBuyerName(sess.name)
    if (sess.cpf) setBuyerCpf(sess.cpf)
    setBuyerHasCpf(!!sess.cpf)
    setPhase(sess.authed ? 'attendees' : 'account')
  }

  // Fecha a compra com a ficha dos participantes. Vincula a sessão (estende a reserva) e
  // paga; o cartão sai daqui para o ambiente do gateway.
  async function doPay(list: Attendee[]) {
    if (!sessionId) return
    setError('')
    setBusy(true)
    const bind = await bindSession(sessionId)
    if (!bind.ok) {
      setBusy(false)
      backToForm('Sua reserva expirou enquanto você preenchia. Refaça a seleção.')
      return
    }
    const { ok, status, data } = await paySession(sessionId, {
      method,
      buyer_cpf: cpf || undefined,
      attendees: list.length ? list : undefined,
    })
    setBusy(false)
    if (!ok) {
      if (status === 409) {
        backToForm('Sua reserva expirou. Refaça a seleção.')
      } else {
        setError(data?.error || 'Não foi possível concluir o pagamento. Tente novamente.')
        setPhase('attendees')
      }
      return
    }
    setOrder({ id: data.order_id, pix: data.pix_code })
    if (method === 'credit_card') {
      // O cartão é digitado no ambiente do gateway: abre lá e a confirmação chega aqui
      // pelo acompanhamento do pedido.
      setInvoiceURL(data.invoice_url ?? '')
      setPhase('card')
      if (data.invoice_url) window.open(data.invoice_url, '_blank', 'noopener')
      return
    }
    setPhase('pix')
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

  // ── cadastro/entrar (a compra exige conta; o resumo do pedido fica visível) ──
  if (phase === 'account') {
    return (
      <Panel>
        <Steps current="account" />
        <OrderSummary qty={qty} total={bd ? bd.total_cents : total} />
        <BuyerAccountForm onReady={loadBuyer} onStarted={() => sessionId && authStarted(sessionId)} />
      </Panel>
    )
  }

  // ── participantes (ingresso nominal) ──
  if (phase === 'attendees') {
    return (
      <Panel>
        <Steps current="attendees" />
        <HoldTimer seconds={config.hold_ttl_seconds} />
        <OrderSummary qty={qty} total={bd ? bd.total_cents : total} />
        {error && <p className="mb-3 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
        <AttendeeForm
          quantity={qty}
          buyer={{ name: buyerName, cpf: buyerCpf, email: buyerEmail }}
          initial={attendees.length ? attendees : undefined}
          busy={busy}
          onSubmit={(list) => {
            setAttendees(list)
            doPay(list)
          }}
        />
        <button className="mt-3 w-full text-center text-xs text-muted-foreground underline" onClick={() => setPhase('form')}>
          Voltar e mudar a seleção
        </button>
      </Panel>
    )
  }

  // ── cartão: pago no ambiente do gateway, confirmação acompanhada aqui ──
  if (phase === 'card' && order) {
    return (
      <Panel>
        <Steps current="pix" />
        <HoldTimer seconds={config.hold_ttl_seconds} />
        <p className="text-sm text-muted-foreground">
          Abrimos o pagamento seguro em outra aba. Conclua por lá e volte para esta tela — a confirmação
          aparece aqui automaticamente.
        </p>
        {invoiceURL && (
          <a href={invoiceURL} target="_blank" rel="noopener noreferrer" className="mt-3 block">
            <Button className="w-full">Abrir pagamento com cartão</Button>
          </a>
        )}
        <div className="mt-4">
          <CardWait orderId={order.id} onPaid={() => setPhase('done')} />
        </div>
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
            Enviamos seu ingresso para {buyerEmail}. Acesse abaixo — funciona até sem sinal.
          </p>
          <Link href="/conta" className="mt-4 block">
            <Button className="w-full">Ver meus ingressos</Button>
          </Link>
        </div>
      </Panel>
    )
  }

  // ── seleção (sem conta — navegar, escolher, ver o total) ──
  return (
    <Panel>
      <Steps current="form" />
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
      <Button size="lg" className="mt-3 w-full" disabled={busy || qty < 1} onClick={goToPayment}>
        {busy ? 'Reservando…' : 'Continuar'}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Reservamos sua escolha enquanto você preenche os dados.
      </p>
    </Panel>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-5">{children}</div>
}

// Steps mostra onde a pessoa está e quanto falta. Numa compra com quatro telas, sumir com
// esse mapa é o que faz o comprador achar que travou.
function Steps({ current }: { current: Phase }) {
  const idx = STEPS.findIndex((s) => s.key === current)
  return (
    <ol className="mb-4 flex items-center gap-1.5 text-xs" aria-label="Etapas da compra">
      {STEPS.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'current' : 'todo'
        return (
          <li key={s.key} className="flex flex-1 items-center gap-1.5">
            <span
              aria-current={state === 'current' ? 'step' : undefined}
              className={
                state === 'current'
                  ? 'font-medium text-foreground'
                  : state === 'done'
                    ? 'text-primary'
                    : 'text-muted-foreground'
              }
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        )
      })}
    </ol>
  )
}

// OrderSummary mantém o que está sendo comprado à vista em todas as etapas — o comprador
// não deveria precisar voltar para lembrar quanto vai pagar.
function OrderSummary({ qty, total }: { qty: number; total: number }) {
  return (
    <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
      <span className="text-sm text-muted-foreground">Ingresso{qty > 1 ? ` (${qty}×)` : ''}</span>
      <span className="font-display text-lg font-semibold">{brl(total)}</span>
    </div>
  )
}

// Máscara de CPF (000.000.000-00) — melhora a legibilidade e reduz erro de digitação.
function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
