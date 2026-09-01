'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Download, Plus } from 'lucide-react'
import { ProducerNav } from '@/components/producer-nav'
import { RichEditor } from '@/components/rich-editor'
import { RefundPolicyForm } from '@/components/refund-policy-form'
import { ReceivingAccount } from '@/components/receiving-account'
import { PayoutPanel } from '@/components/payout-panel'
import { Button } from '@/components/ui/button'
import { pget, ppatch, ppost, psend } from '@/lib/producer'
import { brl, formatDateTime } from '@/lib/format'

type Lot = {
  id: string; name: string; price_cents: number; quantity: number; sold_count: number
  held_count: number; sort_order: number; min_purchase_quantity: number
  max_purchase_quantity?: number | null; notice?: string | null
  hidden: boolean; availability: string; turn_trigger: string
}
type LotLink = {
  id: string; lot_id: string; token: string; label?: string | null
  max_uses?: number | null; used_count: number; expires_at?: string | null; active: boolean
}
type Sector = { id: string; name: string; kind: string }
type Ev = {
  id: string; title: string; status: string; starts_at?: string; has_seat_map: boolean
  subtitle?: string; description?: string; terms?: string; age_rating?: string; address?: string
}

const inp = 'h-10 w-full rounded-lg border border-border bg-card px-3 text-sm'

export default function EventoPainelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [ev, setEv] = useState<Ev | null>(null)
  const [lots, setLots] = useState<Lot[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [msg, setMsg] = useState('')

  const load = useCallback(() => {
    pget(`events/${id}`).then((r) => {
      if (r.status === 401) return router.replace('/painel/entrar')
      if (!r.ok) return
      setEv(r.data.event)
      setLots(r.data.lots ?? [])
    })
    pget(`events/${id}/sectors`).then((r) => r.ok && setSectors(r.data.sectors ?? []))
  }, [id, router])

  useEffect(load, [load])
  const [needsWallet, setNeedsWallet] = useState(false)

  async function lifecycle(action: string) {
    setMsg('')
    const r = await ppost(`events/${id}/${action}`)
    // Publicar sem conta de recebimento não é erro de evento: é cadastro faltando. Abre o
    // formulário aqui mesmo, com o motivo, em vez de mandar a pessoa procurar.
    if (!r.ok && r.data?.needs_wallet) {
      setNeedsWallet(true)
      setMsg(r.data.error_message || 'Informe os dados de recebimento antes de publicar.')
      return
    }
    setMsg(r.ok ? 'Feito.' : r.data?.error || 'Não foi possível.')
    load()
  }

  if (!ev) return (<><ProducerNav /><main className="mx-auto max-w-3xl px-4 pt-8 text-muted-foreground">Carregando…</main></>)

  const published = ev.status === 'published'

  return (
    <>
      <ProducerNav />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8">
        <Link href="/painel" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"><ChevronLeft className="size-4" /> Voltar</Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">{ev.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(ev.starts_at)} · {ev.status}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {!published && <Button onClick={() => lifecycle('publish')}>Publicar</Button>}
            {published && <Button variant="outline" onClick={() => lifecycle('suspend')}>Suspender</Button>}
            {ev.status !== 'cancelled' && <Button variant="ghost" onClick={() => lifecycle('cancel')}>Cancelar</Button>}
            {published && <Link href={`/eventos/${id}`} className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm">Ver página</Link>}
          </div>
        </div>
        {msg && <p className="mt-3 rounded-lg bg-secondary p-2 text-sm">{msg}</p>}
        {needsWallet && (
          <div className="mt-3">
            <ReceivingAccount onConfigured={() => setNeedsWallet(false)} />
          </div>
        )}
        {!published && (
          <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            Para publicar: ao menos um lote{ev.has_seat_map ? ', um setor com assentos' : ''} e data futura.
          </p>
        )}

        <Lots eventId={id} lots={lots} onChange={load} />
        <Sectors eventId={id} sectors={sectors} hasSeatMap={ev.has_seat_map} onChange={load} />
        {sectors.length > 0 && lots.length > 0 && <Prices lots={lots} sectors={sectors} />}
        <HalfPriceQuota eventId={id} />
        <Coupons eventId={id} />
        <Section title="Política de devolução deste evento">
          <RefundPolicyForm eventId={id} />
        </Section>
        <Courtesies eventId={id} lots={lots} />
        <EventText eventId={id} ev={ev} onSaved={load} />
        {ev.status === 'cancelled' && <CancellationProgress eventId={id} />}
        <Sales eventId={id} />
        <Exportar eventId={id} />
        <Fechamento eventId={id} />
        <Notificacoes eventId={id} />
      </main>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Tipos de ingresso do evento.
 *
 * Um evento tem três formas de vender, e elas convivem: a FILA (lote 1 vira lote 2), os
 * SIMULTÂNEOS (pista e camarote abertos juntos) e a categoria AVULSA. A escolha é por
 * categoria, não pelo evento inteiro.
 *
 * "+ Adicionar" e "Salvar" são botões diferentes, de propósito: o produtor usava adicionar
 * como se fosse salvar, e perdia a edição.
 */
function Lots({ eventId, lots, onChange }: { eventId: string; lots: Lot[]; onChange: () => void }) {
  const [f, setF] = useState({
    name: '', price: '', quantity: '', min: '1', max: '', notice: '',
    availability: 'sequential', turn_trigger: 'either',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const minQ = parseInt(f.min) || 1
  const maxQ = f.max.trim() === '' ? null : parseInt(f.max) || 0

  async function add() {
    setBusy(true)
    setError('')
    const res = await ppost(`events/${eventId}/lots`, {
      name: f.name, price_cents: Math.round(parseFloat(f.price.replace(',', '.')) * 100) || 0,
      quantity: parseInt(f.quantity) || 0, sort_order: lots.length,
      min_purchase_quantity: minQ, max_purchase_quantity: maxQ,
      notice: f.notice.trim() || null,
      availability: f.availability, turn_trigger: f.turn_trigger,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.data?.error ?? 'não foi possível criar o ingresso')
      return
    }
    setF({ name: '', price: '', quantity: '', min: '1', max: '', notice: '', availability: 'sequential', turn_trigger: 'either' })
    onChange()
  }

  return (
    <Section title="Tipos de ingresso">
      <div className="space-y-2">
        {lots.map((l) => <LotRow key={l.id} lot={l} eventId={eventId} onChange={onChange} />)}
        {lots.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum tipo de ingresso ainda. Crie o primeiro abaixo.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-medium">Criar ingresso</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <input placeholder="Nome (ex.: Pista, 1º lote)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={`${inp} col-span-2 sm:col-span-1`} />
          <input placeholder="Preço R$" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={inp} />
          <input placeholder="Quantidade" inputMode="numeric" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} className={inp} />
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block text-xs text-muted-foreground">
            Como este ingresso é vendido
            <select value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value })}
              className={`${inp} mt-1`}>
              <option value="sequential">Em fila — abre quando o anterior encerra</option>
              <option value="always">Sozinho — vendido junto com os outros</option>
            </select>
          </label>
          {f.availability === 'sequential' && (
            <label className="block text-xs text-muted-foreground">
              O que encerra este lote
              <select value={f.turn_trigger} onChange={(e) => setF({ ...f, turn_trigger: e.target.value })}
                className={`${inp} mt-1`}>
                <option value="either">O que vier primeiro: esgotar ou a data</option>
                <option value="sellout">Só quando esgotar</option>
                <option value="date">Só na data — esgotar não adianta a virada</option>
              </select>
            </label>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Em fila é o lote clássico: um por vez. Sozinho é o que convive — pista e camarote
          abertos ao mesmo tempo, ou uma categoria que não entra em fila nenhuma.
        </p>

        <div className="mt-3 rounded-lg border border-border bg-background p-3">
          <p className="text-sm font-medium">Quantidade por compra</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Deixe 1 para venda avulsa. Mínimo e máximo iguais a 2 é o ingresso duplo — e o
            mesmo vale para trio ou grupo.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground">
              Mín.
              <input inputMode="numeric" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })}
                className={`${inp} ml-1 w-16`} />
            </label>
            <label className="text-xs text-muted-foreground">
              Máx.
              <input inputMode="numeric" placeholder="—" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })}
                className={`${inp} ml-1 w-16`} />
            </label>
            <Button size="sm" variant="outline" onClick={() => setF({ ...f, min: '2', max: '2' })}>
              Ingresso duplo
            </Button>
          </div>
          {minQ > 1 && (
            <p className="mt-2 rounded-lg bg-card p-2 text-xs">
              O preço informado é <strong>por ingresso</strong>. Quem comprar {minQ} vai pagar{' '}
              <strong>{brl(Math.round((parseFloat(f.price.replace(',', '.')) || 0) * 100) * minQ)}</strong>.
            </p>
          )}
        </div>

        <div className="mt-3">
          <label className="text-xs text-muted-foreground" htmlFor="lot-notice">
            Aviso desta categoria (opcional) — aparece na página de venda e no e-mail do ingresso
          </label>
          <input id="lot-notice" maxLength={280} value={f.notice}
            onChange={(e) => setF({ ...f, notice: e.target.value })}
            placeholder="Ex.: acomodações por ordem de chegada"
            className={`${inp} mt-1 w-full`} />
        </div>

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Button className="mt-3" disabled={busy || !f.name} onClick={add}>
          <Plus className="size-4" /> Criar ingresso
        </Button>
      </div>
    </Section>
  )
}

const MODO_LABEL: Record<string, string> = {
  sequential: 'em fila',
  always: 'vendido sozinho',
}
const GATILHO_LABEL: Record<string, string> = {
  either: 'encerra ao esgotar ou na data',
  sellout: 'encerra só ao esgotar',
  date: 'encerra só na data',
}

/**
 * Uma categoria de ingresso, editável no lugar.
 *
 * Editar abre um formulário com botão de SALVAR próprio, e sair com alteração não salva
 * avisa: adicionar e salvar deixaram de ser o mesmo botão.
 */
function LotRow({ lot, eventId, onChange }: { lot: Lot; eventId: string; onChange: () => void }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({
    name: lot.name,
    price: (lot.price_cents / 100).toFixed(2),
    quantity: String(lot.quantity),
    notice: lot.notice ?? '',
    availability: lot.availability,
    turn_trigger: lot.turn_trigger,
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const sujo =
    f.name !== lot.name ||
    f.price !== (lot.price_cents / 100).toFixed(2) ||
    f.quantity !== String(lot.quantity) ||
    f.notice !== (lot.notice ?? '') ||
    f.availability !== lot.availability ||
    f.turn_trigger !== lot.turn_trigger

  // Sair com alteração não salva avisa. É o mesmo motivo do botão separado: o trabalho de
  // remontar preço e quantidade não pode se perder num clique fora.
  useEffect(() => {
    if (!sujo) return
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [sujo])

  async function salvar() {
    setBusy(true)
    setMsg('')
    const r = await ppatch(`lots/${lot.id}`, {
      name: f.name,
      price_cents: Math.round(parseFloat(f.price.replace(',', '.')) * 100) || 0,
      quantity: parseInt(f.quantity) || 0,
      notice: f.notice.trim(),
      availability: f.availability,
      turn_trigger: f.turn_trigger,
    })
    setBusy(false)
    if (!r.ok) return setMsg(r.data?.error ?? 'Não foi possível salvar.')
    setMsg('Salvo.')
    onChange()
  }

  function fechar() {
    if (sujo && !window.confirm('Você tem alterações não salvas neste ingresso. Descartar?')) return
    setF({
      name: lot.name, price: (lot.price_cents / 100).toFixed(2), quantity: String(lot.quantity),
      notice: lot.notice ?? '', availability: lot.availability, turn_trigger: lot.turn_trigger,
    })
    setOpen(false)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">
          {lot.name}
          {lot.hidden && <span className="ml-2 text-xs text-muted-foreground">· só por link</span>}
        </span>
        <span className="text-muted-foreground">
          {brl(lot.price_cents)} · {lot.sold_count}/{lot.quantity} vendidos
          {lot.min_purchase_quantity > 1 && <> · {comboLabel(lot.min_purchase_quantity, lot.max_purchase_quantity)}</>}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {MODO_LABEL[lot.availability] ?? lot.availability}
        {lot.availability === 'sequential' && <> · {GATILHO_LABEL[lot.turn_trigger] ?? lot.turn_trigger}</>}
        {lot.notice && <span className="mt-0.5 block">“{lot.notice}”</span>}
      </p>
      <button className="mt-1 text-xs text-muted-foreground underline"
        onClick={() => (open ? fechar() : setOpen(true))}>
        {open ? 'fechar' : 'editar'}
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={`${inp} col-span-2 sm:col-span-1`} />
            <input inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={inp} />
            <input inputMode="numeric" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} className={inp} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value })} className={inp}>
              <option value="sequential">Em fila</option>
              <option value="always">Vendido sozinho</option>
            </select>
            {f.availability === 'sequential' && (
              <select value={f.turn_trigger} onChange={(e) => setF({ ...f, turn_trigger: e.target.value })} className={inp}>
                <option value="either">Encerra ao esgotar ou na data</option>
                <option value="sellout">Encerra só ao esgotar</option>
                <option value="date">Encerra só na data</option>
              </select>
            )}
          </div>
          <input maxLength={280} value={f.notice} onChange={(e) => setF({ ...f, notice: e.target.value })}
            placeholder="Aviso desta categoria (opcional)" className={inp} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={salvar} disabled={busy || !sujo}>
              {busy ? 'Salvando…' : 'Salvar'}
            </Button>
            {sujo && <span className="text-xs text-signal">alterações não salvas</span>}
            {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
          </div>
          <LotLinks lot={lot} eventId={eventId} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

/**
 * Links exclusivos de uma categoria.
 *
 * Criar o link ESCONDE a categoria da página pública — link privado para algo que já aparece
 * na página não é privado. O token é mostrado inteiro uma vez e fica disponível para copiar:
 * ele é a chave, e quem tem o link entra.
 */
function LotLinks({ lot, eventId, onChange }: { lot: Lot; eventId: string; onChange: () => void }) {
  const [links, setLinks] = useState<LotLink[]>([])
  const [f, setF] = useState({ label: '', max_uses: '', expires_at: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    pget(`events/${eventId}/lot-links`).then((r) => {
      if (!r.ok) return
      setLinks((r.data.links ?? []).filter((l: LotLink) => l.lot_id === lot.id))
    })
  }, [eventId, lot.id])
  useEffect(load, [load])

  async function criar() {
    setBusy(true)
    const r = await ppost(`lots/${lot.id}/links`, {
      label: f.label || undefined,
      max_uses: f.max_uses ? parseInt(f.max_uses) : null,
      expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null,
    })
    setBusy(false)
    if (!r.ok) return window.alert(r.data?.error ?? 'Não foi possível criar o link.')
    setF({ label: '', max_uses: '', expires_at: '' })
    load()
    onChange()
  }

  async function revogar(id: string) {
    if (!window.confirm('Revogar este link? Quem já o tem deixa de conseguir comprar, na hora.')) return
    await ppost(`lot-links/${id}/revoke`)
    load()
  }

  const url = (t: string) =>
    `${typeof window === 'undefined' ? '' : window.location.origin}/eventos/${eventId}?k=${t}`

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-sm font-medium">Link exclusivo</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Criar um link tira esta categoria da página pública: ela passa a existir só para quem
        tem o endereço. Revogar desliga na hora.
      </p>

      <ul className="mt-2 space-y-1">
        {links.map((l) => (
          <li key={l.id} className="rounded-lg border border-border bg-card p-2 text-xs">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{l.label || 'sem apelido'}</span>
              <span className={l.active ? 'text-muted-foreground' : 'text-signal'}>
                {l.active ? 'ativo' : 'encerrado'} · {l.used_count}
                {l.max_uses ? `/${l.max_uses}` : ''} usos
              </span>
            </div>
            <code className="mt-1 block break-all text-[10px] text-muted-foreground">{url(l.token)}</code>
            <div className="mt-1 flex gap-3">
              <button className="underline" onClick={() => navigator.clipboard?.writeText(url(l.token))}>copiar</button>
              {l.active && <button className="text-signal underline" onClick={() => revogar(l.id)}>revogar</button>}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input placeholder="Apelido" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className={inp} />
        <input placeholder="Limite de usos" inputMode="numeric" value={f.max_uses}
          onChange={(e) => setF({ ...f, max_uses: e.target.value })} className={inp} />
        <input type="datetime-local" value={f.expires_at}
          onChange={(e) => setF({ ...f, expires_at: e.target.value })} className={inp} />
      </div>
      <Button size="sm" variant="outline" className="mt-2" onClick={criar} disabled={busy}>
        Gerar link
      </Button>
    </div>
  )
}

function Sectors({ eventId, sectors, hasSeatMap, onChange }: { eventId: string; sectors: Sector[]; hasSeatMap: boolean; onChange: () => void }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState('seated')
  const [gen, setGen] = useState<Record<string, { rows: string; per: string }>>({})
  async function add() {
    await ppost(`events/${eventId}/sectors`, { name, kind })
    setName('')
    onChange()
  }
  async function generate(sectorId: string) {
    const g = gen[sectorId] || { rows: '', per: '' }
    await ppost(`sectors/${sectorId}/seats/generate`, {
      rows: parseInt(g.rows) || 0, seats_per_row: parseInt(g.per) || 0, row_style: 'alpha',
    })
    onChange()
  }
  return (
    <Section title="Setores e assentos">
      <div className="space-y-2">
        {sectors.map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground">{s.kind}</span>
            </div>
            {s.kind !== 'standing' && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input placeholder="Fileiras" inputMode="numeric" className={`${inp} w-24`}
                  value={gen[s.id]?.rows ?? ''} onChange={(e) => setGen({ ...gen, [s.id]: { ...(gen[s.id] || { rows: '', per: '' }), rows: e.target.value } })} />
                <input placeholder="Assentos/fileira" inputMode="numeric" className={`${inp} w-36`}
                  value={gen[s.id]?.per ?? ''} onChange={(e) => setGen({ ...gen, [s.id]: { ...(gen[s.id] || { rows: '', per: '' }), per: e.target.value } })} />
                <Button size="sm" variant="outline" onClick={() => generate(s.id)}>Gerar assentos</Button>
              </div>
            )}
          </div>
        ))}
        {sectors.length === 0 && <p className="text-sm text-muted-foreground">{hasSeatMap ? 'Adicione ao menos um setor com assentos.' : 'Opcional para evento de pista.'}</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input placeholder="Nome do setor" value={name} onChange={(e) => setName(e.target.value)} className={`${inp} flex-1`} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={inp}>
          <option value="seated">Assentos</option>
          <option value="standing">Pista</option>
          <option value="table">Mesa</option>
        </select>
        <Button size="sm" disabled={!name} onClick={add}><Plus className="size-4" /> Setor</Button>
      </div>
    </Section>
  )
}

function Prices({ lots, sectors }: { lots: Lot[]; sectors: Sector[] }) {
  const [lotId, setLotId] = useState(lots[0]?.id ?? '')
  const [sectorId, setSectorId] = useState(sectors[0]?.id ?? '')
  const [price, setPrice] = useState('')
  const [msg, setMsg] = useState('')
  async function set() {
    const r = await ppost(`lots/${lotId}/prices`, { sector_id: sectorId, price_cents: Math.round(parseFloat(price.replace(',', '.')) * 100) || 0 })
    setMsg(r.ok ? 'Preço definido.' : 'Falhou.')
  }
  return (
    <Section title="Preço por setor (lote × setor)">
      <div className="flex flex-wrap items-center gap-2">
        <select value={lotId} onChange={(e) => setLotId(e.target.value)} className={inp}>{lots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select value={sectorId} onChange={(e) => setSectorId(e.target.value)} className={inp}>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input placeholder="Preço R$" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inp} w-28`} />
        <Button size="sm" onClick={set}>Definir</Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </Section>
  )
}

type Guest = {
  id: string
  name: string
  status: string
  courtesy_category_id?: string
  courtesy_category?: string
}

type Cat = { id: string; name: string; slug: string; active: boolean }

type Commitment = {
  kind: string
  category?: string
  target_type: string
  target_value?: string | number
  realized?: number
  description?: string
  status: string
}

/**
 * Cortesias e suas categorias.
 *
 * A categoria não é etiqueta: a comprovação de público publica cortesia POR categoria e
 * confronta com o compromisso declarado. Cortesia sem categoria some do atestado — por isso
 * ela é obrigatória aqui, sem opção "sem categoria" que jogue tudo num balde.
 *
 * As categorias valem para TODOS os seus eventos: editar uma aqui muda o nome dela em todos.
 * Elas se arquivam, nunca se apagam — a cortesia já emitida precisa continuar apontando para
 * a categoria em que foi contada, senão o atestado de um evento passado muda sozinho.
 */
function Courtesies({ eventId, lots }: { eventId: string; lots: Lot[] }) {
  const [g, setG] = useState({ name: '', email: '', phone: '' })
  const [lista, setLista] = useState('')
  const [emLote, setEmLote] = useState(false)
  const [lotId, setLotId] = useState('')
  const [catId, setCatId] = useState('')
  const [cats, setCats] = useState<Cat[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [novaCat, setNovaCat] = useState('')
  const [msg, setMsg] = useState('')
  const [gerir, setGerir] = useState(false)

  const load = useCallback(() => {
    pget('courtesy-categories?all=true').then((r) => r.ok && setCats(r.data.categories ?? []))
    pget(`events/${eventId}/guests`).then((r) => r.ok && setGuests(r.data.guests ?? []))
  }, [eventId])
  useEffect(load, [load])

  const ativas = cats.filter((c) => c.active)
  // Contagem por categoria: é o número que o atestado publica.
  const porCategoria = guests.reduce<Record<string, number>>((acc, g) => {
    const k = g.courtesy_category || 'sem categoria'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  async function give() {
    if (!catId) return setMsg('Escolha a categoria — é por ela que a cortesia é contada.')
    const r = await ppost(`events/${eventId}/guests`, {
      name: g.name, email: g.email.trim() || undefined, phone: g.phone.trim() || undefined,
      lot_id: lotId || lots[0]?.id, courtesy_category_id: catId,
    })
    setMsg(
      r.ok
        ? g.email
          ? `Cortesia emitida e enviada para ${g.email}.`
          : 'Cortesia emitida. Sem e-mail, a entrega fica por sua conta.'
        : r.data?.error || 'Falhou.',
    )
    if (r.ok) { setG({ name: '', email: '', phone: '' }); load() }
  }

  /**
   * Emissão em lote por lista.
   *
   * Uma pessoa por linha, "Nome, e-mail". Cada linha é emitida por si: numa lista de cem, um
   * assento ocupado ou um nome vazio não pode derrubar as noventa e nove que deram certo — e
   * o resultado volta linha a linha.
   */
  async function giveBatch() {
    if (!catId) return setMsg('Escolha a categoria — é por ela que a cortesia é contada.')
    const guests = lista
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [nome, email, tel] = l.split(',').map((x) => x.trim())
        return { name: nome ?? '', email: email ?? '', phone: tel ?? '' }
      })
    if (guests.length === 0) return setMsg('Cole a lista, uma pessoa por linha.')
    const r = await ppost(`events/${eventId}/guests/batch`, {
      courtesy_category_id: catId, lot_id: lotId || lots[0]?.id, guests,
    })
    if (!r.ok) return setMsg(r.data?.error || 'Falhou.')
    const falhas = (r.data.results ?? []).filter((x: { error?: string }) => x.error)
    setMsg(
      falhas.length === 0
        ? `${r.data.issued} cortesias emitidas.`
        : `${r.data.issued} emitidas; ${falhas.length} não: ` +
          falhas.map((x: { name: string; error: string }) => `${x.name || '(sem nome)'} — ${x.error}`).join('; '),
    )
    if (r.data.issued > 0) { setLista(''); load() }
  }

  async function criarCategoria() {
    const nome = novaCat.trim()
    if (!nome) return
    const slug = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const r = await ppost('courtesy-categories', { slug, name: nome, sort_order: cats.length + 1 })
    setMsg(r.ok ? 'Categoria criada.' : r.data?.error || 'Falhou.')
    if (r.ok) { setNovaCat(''); load() }
  }

  async function arquivar(c: Cat) {
    const r = await ppatch(`courtesy-categories/${c.id}`, { active: !c.active })
    if (r.ok) load()
  }

  async function reclassificar(g: Guest, categoryId: string) {
    const r = await ppost(`guests/${g.id}/category`, { courtesy_category_id: categoryId })
    setMsg(r.ok ? 'Cortesia reclassificada.' : r.data?.error || 'Falhou.')
    if (r.ok) load()
  }

  return (
    <Section title="Cortesias">
      {Object.keys(porCategoria).length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          {Object.entries(porCategoria).map(([k, n]) => (
            <span key={k} className="rounded-full bg-secondary px-3 py-1">
              {k}: <strong>{n}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex gap-3 text-sm">
          <button className={!emLote ? 'font-medium' : 'text-muted-foreground'} onClick={() => setEmLote(false)}>
            Uma pessoa
          </button>
          <button className={emLote ? 'font-medium' : 'text-muted-foreground'} onClick={() => setEmLote(true)}>
            Lista
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className={inp}>
            <option value="">Categoria da cortesia…</option>
            {ativas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={lotId} onChange={(e) => setLotId(e.target.value)} className={inp}>
            <option value="">Tipo de ingresso…</option>
            {lots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {!emLote ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <input placeholder="Nome de quem recebe" value={g.name}
              onChange={(e) => setG({ ...g, name: e.target.value })} className={inp} />
            <input placeholder="E-mail" type="email" value={g.email}
              onChange={(e) => setG({ ...g, email: e.target.value })} className={inp} />
            <input placeholder="Telefone (opcional)" value={g.phone}
              onChange={(e) => setG({ ...g, phone: e.target.value })} className={inp} />
          </div>
        ) : (
          <textarea rows={5} value={lista} onChange={(e) => setLista(e.target.value)}
            placeholder={'Uma pessoa por linha:\nAna Silva, ana@email.com\nJoão Souza, joao@email.com, 31999998888'}
            className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm" />
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          Com e-mail, a pessoa recebe o ingresso na hora — e o aviso diz que foi você que
          enviou. Sem e-mail, o ingresso é emitido e a entrega fica por sua conta.
        </p>

        <Button size="sm" className="mt-2"
          disabled={emLote ? !lista.trim() : !g.name}
          onClick={emLote ? giveBatch : give}>
          {emLote ? 'Emitir lista' : 'Emitir cortesia'}
        </Button>
      </div>
      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}

      {guests.length > 0 && (
        <ul className="mt-4 space-y-1">
          {guests.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <span>{g.name} <span className="text-xs text-muted-foreground">· {g.status}</span></span>
              <select value={g.courtesy_category_id ?? ''} className={`${inp} text-xs`}
                onChange={(e) => reclassificar(g, e.target.value)}>
                {!g.courtesy_category_id && <option value="">sem categoria</option>}
                {ativas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}

      <button onClick={() => setGerir((v) => !v)}
        className="mt-4 text-sm text-muted-foreground hover:text-foreground hover:underline">
        {gerir ? 'Fechar categorias' : 'Gerenciar categorias'}
      </button>
      {gerir && (
        <div className="mt-2 rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">
            As categorias valem para todos os seus eventos. Elas se <strong>arquivam</strong>,
            nunca se apagam — a cortesia já emitida precisa continuar apontando para a
            categoria em que foi contada.
          </p>
          <ul className="mt-2 space-y-1">
            {cats.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span className={c.active ? '' : 'text-muted-foreground line-through'}>{c.name}</span>
                <button onClick={() => arquivar(c)}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                  {c.active ? 'arquivar' : 'reativar'}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input placeholder="Nova categoria (ex.: permuta)" value={novaCat}
              onChange={(e) => setNovaCat(e.target.value)} className={`${inp} flex-1`} />
            <Button size="sm" variant="outline" onClick={criarCategoria}>Criar</Button>
          </div>
        </div>
      )}
    </Section>
  )
}

function Sales({ eventId }: { eventId: string }) {
  const [d, setD] = useState<any>(null)
  useEffect(() => { pget(`dash/events/${eventId}`).then((r) => r.ok && setD(r.data)) }, [eventId])
  if (!d) return null
  const fin = d.finance ?? {}
  const funnel = d.session_funnel
  return (
    <Section title="Vendas">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Bruto (face)</p><p className="mt-1 font-display text-xl font-bold">{brl(fin.gross_cents)}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Seu repasse</p><p className="mt-1 font-display text-xl font-bold">{brl(fin.repasse_cents)}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Taxa (comprador)</p><p className="mt-1 font-display text-xl font-bold">{brl(fin.taxa_cents)}</p></div>
        {(fin.estorno_cents ?? 0) !== 0 && (
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Devolvido</p><p className="mt-1 font-display text-xl font-bold text-destructive">{brl(Math.abs(fin.estorno_cents ?? 0))}</p></div>
        )}
      </div>
      {d.payout && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">Seu repasse</p>
          <PayoutPanel p={d.payout} />
        </div>
      )}
      {funnel && (
        <p className="mt-3 rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
          Sessões vinculadas: <span className="font-medium text-foreground">{funnel.bound}</span> · pagas:{' '}
          <span className="font-medium text-foreground">{funnel.paid}</span> · abandonadas:{' '}
          <span className="font-medium text-foreground">{funnel.abandoned}</span>
        </p>
      )}
    </Section>
  )
}

// Envios de ingresso por evento: quantos foram, quantos falharam e reenvio. É a primeira
// coisa que o produtor procura quando alguém diz que não recebeu o QR.
function Notificacoes({ eventId }: { eventId: string }) {
  const [d, setD] = useState<any>(null)
  const load = () => pget(`dash/events/${eventId}/notifications`).then((r) => r.ok && setD(r.data))
  useEffect(() => { load() }, [eventId])
  async function resend(id: string) {
    await ppost(`notifications/${id}/resend`)
    load()
  }
  if (!d) return null
  const failed = (d.notifications ?? []).filter((n: any) => n.status === 'failed')
  const loggedOnly = d.logged_only ?? 0
  return (
    <Section title="Envios de ingresso">
      <p className="text-sm text-muted-foreground">
        Entregues: <span className="font-medium text-foreground">{d.sent}</span> · Falhas:{' '}
        <span className="font-medium text-foreground">{d.failed}</span>
      </p>
      {loggedOnly > 0 && (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <span className="font-medium">{loggedOnly}</span>{' '}
          {loggedOnly === 1 ? 'mensagem foi registrada mas não saiu' : 'mensagens foram registradas mas não saíram'}:
          o servidor está sem provedor de e-mail configurado. Defina <code>RESEND_API_KEY</code> e{' '}
          <code>MAIL_FROM</code> e reenvie.
        </p>
      )}
      {failed.length > 0 && (
        <ul className="mt-3 space-y-2">
          {failed.map((n: any) => (
            <li key={n.id} className="rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-muted-foreground">{n.to_email}</span>
                <Button size="sm" variant="outline" onClick={() => resend(n.id)}>Reenviar</Button>
              </div>
              {n.last_error && (
                <p className="mt-2 break-words text-xs text-muted-foreground">{n.last_error}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

const STATUS_EXPORT = [
  { v: '', label: 'Todos os status' },
  { v: 'active', label: 'Válidos' },
  { v: 'used', label: 'Já entraram' },
  { v: 'cancelled', label: 'Cancelados' },
  { v: 'transferred', label: 'Transferidos' },
  { v: 'burned', label: 'Devolvidos' },
]

/**
 * Exportação da lista de ingressos.
 *
 * Uma linha por INGRESSO, não por pedido: quem exporta está conferindo portaria, cortesia
 * ou devolução, e tudo isso acontece por ingresso.
 *
 * A planilha NÃO leva CPF. O produtor precisa saber a quem entregar e a quem responder, e
 * nome e e-mail resolvem isso; o CPF só aumenta o estrago de um arquivo que vaza, e uma
 * planilha sai do sistema para dentro de e-mails e pen drives que ninguém mais controla.
 *
 * O download é uma navegação de verdade (não um fetch): o arquivo vem transmitido do
 * servidor e o navegador salva enquanto ele chega, sem passar pela memória da aba.
 */
function Exportar({ eventId }: { eventId: string }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')

  const qs = new URLSearchParams()
  if (from) qs.set('from', from)
  if (to) qs.set('to', to)
  if (status) qs.set('status', status)
  const href = `/api/producer/export/${eventId}${qs.toString() ? `?${qs}` : ''}`

  return (
    <Section title="Exportar lista de ingressos">
      <p className="text-sm text-muted-foreground">
        Uma linha por ingresso, com lote, assento, valor pago, meia-entrada, portador,
        cortesia e horário de entrada. Sem CPF.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">Emitidos de</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inp} />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">até</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inp} />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inp}>
            {STATUS_EXPORT.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </label>
        <a href={href} download
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Download className="size-4" /> Baixar CSV
        </a>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Toda exportação fica registrada na trilha do evento: quem baixou, quando e com qual
        recorte.
      </p>
    </Section>
  )
}

// Comprovação de público: ação de fechar, estado do atestado/âncora, relatórios e o link
// público. Avisa quando há compromisso declarado não cumprido.
function Fechamento({ eventId }: { eventId: string }) {
  const [d, setD] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => pget(`events/${eventId}/reports/commitments`).then((r) => r.ok && setD(r.data))
  useEffect(() => { load() }, [eventId])

  async function close() {
    setBusy(true)
    setMsg('')
    const r = await ppost(`events/${eventId}/close`)
    setBusy(false)
    setMsg(r.ok ? 'Evento fechado. Registro de comprovação gerado e assinado.' : r.data?.error || 'Não foi possível fechar.')
    load()
  }

  if (!d) return null
  const closed = !d.provisional
  const commitments = (d.commitments ?? []) as Commitment[]
  const pending = commitments.filter((c) => c.status === 'nao_cumprido')

  return (
    <Section title="Comprovação de público">
      {/*
        O confronto aparece ANTES de fechar, de propósito: depois do fechamento o número
        está congelado no registro assinado e não há mais o que corrigir.
      */}
      {commitments.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="pb-1 font-normal">Compromisso</th>
                <th className="pb-1 text-right font-normal">Declarado</th>
                <th className="pb-1 text-right font-normal">Emitido</th>
                <th className="pb-1 text-right font-normal">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {commitments.map((c, i) => {
                const alvo = Number(c.target_value ?? 0)
                const feito = Number(c.realized ?? 0)
                const dif = feito - alvo
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1.5">
                      {c.description || c.category || c.kind}
                      {c.target_type === 'percent' && <span className="text-xs text-muted-foreground"> (%)</span>}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{alvo}</td>
                    <td className="py-1.5 text-right tabular-nums">{feito}</td>
                    <td className={`py-1.5 text-right tabular-nums ${dif < 0 ? 'text-signal' : 'text-muted-foreground'}`}>
                      {dif > 0 ? `+${dif}` : dif}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!closed && pending.length > 0 && (
            <p className="mt-2 text-xs text-signal">
              Falta cumprir {pending.length} compromisso(s). Depois de fechar, o número vai
              assinado para o registro público como está.
            </p>
          )}
        </div>
      )}

      {!closed ? (
        <>
          <p className="text-sm text-muted-foreground">
            Ao fechar, novos check-ins e alterações de cortesia, compromisso e lote ficam travados, e
            geramos o registro assinado que comprova o público e a contrapartida do evento.
          </p>
          <Button size="sm" className="mt-3" disabled={busy} onClick={close}>
            {busy ? 'Fechando…' : 'Fechar e comprovar'}
          </Button>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">Evento fechado — registro de comprovação vigente gerado.</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href={`/a/${d.attestation_id}`} className="text-primary">Ver registro público (relatórios) →</Link>
            {(d.anchor_status === 'failed' || d.anchor_status === 'none') && (
              <ReanchorButton eventId={eventId} attestationId={d.attestation_id} onDone={load} />
            )}
          </div>
          {pending.length > 0 && (
            <p className="rounded-lg bg-signal/10 p-2 text-sm text-signal">
              Atenção: há {pending.length} compromisso(s) declarado(s) não cumprido(s) no fechamento.
            </p>
          )}
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
    </Section>
  )
}

// ReanchorButton reenfileira a âncora de um atestado em estado 'failed' ou 'none'.
function ReanchorButton({ eventId, attestationId, onDone }: { eventId: string; attestationId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function go() {
    setBusy(true)
    const r = await ppost(`events/${eventId}/attestations/${attestationId}/anchor`)
    setBusy(false)
    setMsg(r.ok ? 'Âncora reenfileirada.' : r.data?.error || 'Não foi possível reancorar.')
    onDone()
  }
  return (
    <span className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={go}>
        {busy ? '…' : 'Reancorar'}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </span>
  )
}

/**
 * Andamento da devolução do cancelamento.
 *
 * Cancelar enfileira uma devolução por pedido; o produtor precisa ver o lote andar em vez de
 * ficar no escuro achando que nada aconteceu. Falha que esgotou as tentativas é resolvida
 * pela plataforma — dizer isso aqui evita o produtor ficar tentando de novo sozinho.
 */
function CancellationProgress({ eventId }: { eventId: string }) {
  const [p, setP] = useState<{ total: number; done: number; failed: number; pending: number } | null>(null)

  useEffect(() => {
    let alive = true
    const tick = () =>
      pget(`events/${eventId}/cancellation`).then((r) => {
        if (alive && r.ok) setP(r.data)
      })
    tick()
    // Enquanto houver pendente, o lote está andando: vale acompanhar sem recarregar a tela.
    const t = setInterval(tick, 5000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [eventId])

  if (!p || p.total === 0) return null
  const pct = Math.round((p.done / p.total) * 100)
  return (
    <Section title="Devolução do cancelamento">
      <p className="text-sm text-muted-foreground">
        {p.done} de {p.total} {p.total === 1 ? 'compra devolvida' : 'compras devolvidas'}
        {p.pending > 0 && <> · {p.pending} em andamento</>}
        {p.failed > 0 && <> · <span className="text-destructive">{p.failed} com problema</span></>}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      {p.failed > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          As devoluções com problema estão na fila da plataforma, que resolve uma a uma. Você
          não precisa tentar de novo.
        </p>
      )}
    </Section>
  )
}

/** comboLabel nomeia a faixa de quantidade do jeito que o produtor fala. */
function comboLabel(min: number, max?: number | null) {
  if (max === min) {
    if (min === 2) return 'ingresso duplo'
    if (min === 3) return 'ingresso triplo'
    return `combo de ${min}`
  }
  return max ? `de ${min} a ${max} por compra` : `mínimo ${min} por compra`
}

/**
 * Texto do evento: o que o comprador lê antes de decidir.
 *
 * Fica editável depois da criação porque descrição é a parte que mais muda — o produtor
 * publica com o essencial e vai completando conforme fecha atração, horário e regra da casa.
 */
function EventText({ eventId, ev, onSaved }: { eventId: string; ev: Ev; onSaved: () => void }) {
  const [f, setF] = useState({
    subtitle: ev.subtitle ?? '',
    description: ev.description ?? '',
    terms: ev.terms ?? '',
    age_rating: ev.age_rating ?? '',
    address: ev.address ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function save() {
    setBusy(true)
    setMsg('')
    // Campo vazio vira null: o PATCH usa COALESCE, então string vazia manteria o valor
    // antigo e o produtor nunca conseguiria APAGAR o que escreveu.
    const r = await ppatch(`events/${eventId}`, {
      subtitle: f.subtitle.trim() || null,
      description: f.description.trim() || null,
      terms: f.terms.trim() || null,
      age_rating: f.age_rating.trim() || null,
      address: f.address.trim() || null,
    })
    setBusy(false)
    setMsg(r.ok ? 'Salvo.' : (r.data?.error ?? 'Não foi possível salvar.'))
    if (r.ok) onSaved()
  }

  return (
    <Section title="Texto do evento">
      <p className="text-sm text-muted-foreground">
        É o que aparece na página de venda, no card de compartilhamento e na busca.
      </p>
      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-muted-foreground">Subtítulo</span>
          <input value={f.subtitle} maxLength={160}
            onChange={(e) => setF({ ...f, subtitle: e.target.value })}
            placeholder="Ex.: turnê de despedida" className={inp} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted-foreground">Sobre o evento</span>
          <RichEditor value={f.description} onChange={(v) => setF({ ...f, description: v })} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted-foreground">Informações importantes</span>
          <RichEditor value={f.terms} onChange={(v) => setF({ ...f, terms: v })} rows={5} maxLength={2000} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-muted-foreground">Classificação etária</span>
            <input value={f.age_rating} onChange={(e) => setF({ ...f, age_rating: e.target.value })}
              placeholder="Ex.: 14 anos" className={inp} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-muted-foreground">Endereço</span>
            <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })}
              placeholder="Rua, número, bairro" className={inp} />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar texto'}</Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>
    </Section>
  )
}

type Coupon = {
  id: string
  code: string
  discount_pct?: number | null
  discount_cents?: number | null
  max_uses?: number | null
  uses: number
  valid_from?: string | null
  valid_until?: string | null
}

/**
 * Cupons de desconto do evento.
 *
 * O desconto é por PORCENTAGEM ou por VALOR, nunca os dois: são formas diferentes de dizer a
 * mesma coisa, e aceitar as duas juntas deixaria ambíguo qual vale na hora de cobrar.
 *
 * O uso aparece ao lado do limite porque é o que o produtor vem conferir — cupom que já
 * estourou o limite continua existindo, só para de valer, e sem esse número ele parece
 * quebrado.
 */
function Coupons({ eventId }: { eventId: string }) {
  const [list, setList] = useState<Coupon[]>([])
  const [f, setF] = useState({ code: '', kind: 'pct', value: '', max_uses: '', valid_until: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    pget(`events/${eventId}/coupons`).then((r) => r.ok && setList(r.data.coupons ?? []))
  }, [eventId])
  useEffect(load, [load])

  async function add() {
    setError('')
    const code = f.code.trim().toUpperCase()
    if (!code) return setError('Informe o código do cupom.')
    const n = parseFloat(f.value.replace(',', '.'))
    if (!n || n <= 0) return setError('Informe o desconto.')
    if (f.kind === 'pct' && n > 100) return setError('Desconto em porcentagem não passa de 100%.')

    setBusy(true)
    const r = await ppost(`events/${eventId}/coupons`, {
      code,
      discount_pct: f.kind === 'pct' ? n : undefined,
      discount_cents: f.kind === 'cents' ? Math.round(n * 100) : undefined,
      max_uses: f.max_uses ? parseInt(f.max_uses) : undefined,
      // Fim do dia: um cupom que vale "até 20/09" precisa valer o dia 20 inteiro, e não
      // morrer à meia-noite do 19 para o 20.
      valid_until: f.valid_until ? new Date(`${f.valid_until}T23:59:59`).toISOString() : undefined,
    })
    setBusy(false)
    if (!r.ok) return setError(r.data?.error ?? 'Não foi possível criar o cupom.')
    setF({ code: '', kind: 'pct', value: '', max_uses: '', valid_until: '' })
    load()
  }

  return (
    <Section title="Cupons de desconto">
      {list.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum cupom neste evento.</p>
      )}
      <ul className="space-y-2">
        {list.map((c) => {
          const esgotado = c.max_uses != null && c.uses >= c.max_uses
          const vencido = !!c.valid_until && new Date(c.valid_until) < new Date()
          return (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm">
              <span className="font-mono font-medium">{c.code}</span>
              <span className="text-muted-foreground">
                {c.discount_pct ? `${c.discount_pct}% off` : brl(c.discount_cents ?? 0) + ' off'}
                {' · '}
                {c.uses}
                {c.max_uses != null ? `/${c.max_uses} usos` : ' usos'}
                {c.valid_until && <> · até {formatDateTime(c.valid_until)}</>}
                {(esgotado || vencido) && (
                  <span className="ml-2 text-destructive">{esgotado ? 'esgotado' : 'vencido'}</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input placeholder="CÓDIGO" value={f.code}
          onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })}
          className={`${inp} font-mono uppercase`} />
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={inp}>
          <option value="pct">% de desconto</option>
          <option value="cents">R$ de desconto</option>
        </select>
        <input placeholder={f.kind === 'pct' ? '10' : '25,00'} inputMode="decimal" value={f.value}
          onChange={(e) => setF({ ...f, value: e.target.value })} className={inp} />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[auto_auto_auto]">
        <input placeholder="Limite de usos (opcional)" inputMode="numeric" value={f.max_uses}
          onChange={(e) => setF({ ...f, max_uses: e.target.value })} className={inp} />
        <input type="date" value={f.valid_until}
          onChange={(e) => setF({ ...f, valid_until: e.target.value })} className={inp} />
        <Button size="sm" disabled={busy} onClick={add}><Plus className="size-4" /> Cupom</Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </Section>
  )
}

/**
 * Meia-entrada: quanto está reservado, quanto saiu, e quem escolheu.
 *
 * Os 40% da Lei 12.933/2013 são o DEFAULT, não uma trava. A obrigação legal é do produtor —
 * recusar a configuração dele não o faz cumprir a lei, só o impede de operar. Então a tela
 * mostra a regra, avisa quando a escolha fica abaixo dela, e a escolha vai para a trilha com
 * valor, data e usuário.
 *
 * O número aqui é o mesmo que a página de venda publica, porque o art. 1º, §1º obriga a
 * informar a disponibilidade de meia em todos os pontos de venda.
 */
function HalfPriceQuota({ eventId }: { eventId: string }) {
  const [hp, setHp] = useState<{
    quota: number; granted: number; remaining: number
    below_legal?: boolean; legal_quota?: number; mode?: string
  } | null>(null)
  const [modo, setModo] = useState('quota')
  const [pct, setPct] = useState('40')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [aviso, setAviso] = useState('')

  const load = useCallback(() => {
    // A cota vigente vem do mesmo lugar que o painel já consulta para as vendas — é o número
    // que a página pública publica, não uma segunda conta.
    pget(`dash/events/${eventId}`).then((r) => {
      if (!r.ok) return
      const h = r.data.half_price ?? null
      setHp(h)
      if (h?.mode) setModo(h.mode)
    })
    pget(`events/${eventId}/commitments`).then((r) => {
      if (!r.ok) return
      const c = (r.data.commitments ?? []).find(
        (x: { kind: string }) => x.kind === 'meia_entrada_cota',
      ) as { target_type: string; target_value: string } | undefined
      if (c?.target_type === 'percent') setPct(String(parseFloat(c.target_value)))
    })
  }, [eventId])
  useEffect(load, [load])

  async function salvar(novoModo: string) {
    const n = parseFloat(pct.replace(',', '.'))
    setMsg('')
    setAviso('')
    if (novoModo === 'quota' && (!n || n <= 0)) return setMsg('Informe um percentual maior que zero.')
    setBusy(true)
    const r = await psend('PUT', `events/${eventId}/half-price`,
      novoModo === 'linked'
        ? { mode: 'linked' }
        : { mode: 'quota', target_type: 'percent', target_value: String(n) })
    setBusy(false)
    if (!r.ok) return setMsg(r.data?.error ?? 'Não foi possível salvar.')
    setModo(novoModo)
    setMsg('Salvo.')
    setAviso(r.data?.warning ?? '')
    load()
  }

  const vinculada = modo === 'linked'

  return (
    <Section title="Meia-entrada">
      {hp && !vinculada && (
        <>
          <p className="text-sm">
            <strong>{hp.remaining}</strong> de {hp.quota} meias ainda disponíveis
            {hp.granted > 0 && <> · {hp.granted} já emitidas</>}
            {hp.remaining === 0 && (
              <span className="ml-2 text-signal">cota esgotada — a inteira segue à venda</span>
            )}
          </p>
          {/*
            Indicador de nível: quanto da cota já saiu. É o mesmo número da linha acima, em
            forma de barra — o produtor precisa ver de longe que a meia está acabando, porque
            quando ela acaba a página de venda muda o que informa ao comprador.
          */}
          <div className="mt-2" role="img"
            aria-label={`${hp.granted} de ${hp.quota} meias emitidas`}>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full ${hp.remaining === 0 ? 'bg-signal' : 'bg-primary'}`}
                style={{ width: `${hp.quota > 0 ? Math.min(100, (hp.granted / hp.quota) * 100) : 0}%` }}
              />
            </div>
          </div>
        </>
      )}
      {vinculada && (
        <p className="text-sm">
          A meia está <strong>vinculada à inteira</strong>: sai enquanto houver ingresso, sem cota
          própria. {hp?.granted ? `${hp.granted} já emitidas.` : ''}
        </p>
      )}

      {hp?.below_legal && (
        <p className="mt-3 rounded-lg border border-signal/40 bg-signal/10 p-3 text-sm text-signal">
          Esta cota está <strong>abaixo dos 40%</strong> que a Lei 12.933/2013 exige
          {typeof hp.legal_quota === 'number' && <> (seriam {hp.legal_quota} ingressos)</>}. O
          cumprimento da lei é responsabilidade do produtor — a escolha e quem a fez ficaram
          registradas.
        </p>
      )}

      <div className="mt-4 space-y-2">
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" className="mt-1" checked={!vinculada} onChange={() => setModo('quota')} />
          <span>
            Reservar uma cota para meia
            <span className="block text-xs text-muted-foreground">
              A lei pede 40% dos ingressos. Você pode definir outro número.
            </span>
          </span>
        </label>
        {!vinculada && (
          <div className="ml-6 flex flex-wrap items-center gap-2">
            <input inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)}
              className={`${inp} w-24`} />
            <span className="text-sm text-muted-foreground">% dos ingressos</span>
            <Button size="sm" variant="outline" onClick={() => salvar('quota')} disabled={busy}>
              Salvar cota
            </Button>
          </div>
        )}

        <label className="flex items-start gap-2 text-sm">
          <input type="radio" className="mt-1" checked={vinculada} onChange={() => setModo('linked')} />
          <span>
            Vincular a meia à inteira
            <span className="block text-xs text-muted-foreground">
              Sem cota própria: a meia sai enquanto houver ingresso, consumindo o mesmo estoque.
            </span>
          </span>
        </label>
        {vinculada && (
          <div className="ml-6">
            <Button size="sm" variant="outline" onClick={() => salvar('linked')} disabled={busy}>
              Salvar vínculo
            </Button>
          </div>
        )}
      </div>

      {aviso && <p className="mt-3 text-sm text-signal">{aviso}</p>}
      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
    </Section>
  )
}
