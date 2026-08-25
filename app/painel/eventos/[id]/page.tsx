'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus } from 'lucide-react'
import { ProducerNav } from '@/components/producer-nav'
import { ReceivingAccount } from '@/components/receiving-account'
import { Button } from '@/components/ui/button'
import { pget, ppost } from '@/lib/producer'
import { brl, formatDateTime } from '@/lib/format'

type Lot = { id: string; name: string; price_cents: number; quantity: number; sold_count: number; held_count: number; sort_order: number }
type Sector = { id: string; name: string; kind: string }
type Ev = { id: string; title: string; status: string; starts_at?: string; has_seat_map: boolean }

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
        <Courtesies eventId={id} lots={lots} />
        <Sales eventId={id} />
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

function Lots({ eventId, lots, onChange }: { eventId: string; lots: Lot[]; onChange: () => void }) {
  const [f, setF] = useState({ name: '', price: '', quantity: '' })
  const [busy, setBusy] = useState(false)
  async function add() {
    setBusy(true)
    await ppost(`events/${eventId}/lots`, {
      name: f.name, price_cents: Math.round(parseFloat(f.price.replace(',', '.')) * 100) || 0,
      quantity: parseInt(f.quantity) || 0, sort_order: lots.length,
    })
    setBusy(false)
    setF({ name: '', price: '', quantity: '' })
    onChange()
  }
  return (
    <Section title="Lotes">
      <div className="space-y-2">
        {lots.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm">
            <span className="font-medium">{l.name}</span>
            <span className="text-muted-foreground">{brl(l.price_cents)} · {l.sold_count}/{l.quantity} vendidos</span>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input placeholder="Nome (ex.: 1º lote)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} />
        <input placeholder="Preço R$" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={inp} />
        <input placeholder="Qtd" inputMode="numeric" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} className={inp} />
        <Button size="sm" disabled={busy || !f.name} onClick={add}><Plus className="size-4" /> Lote</Button>
      </div>
    </Section>
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

function Courtesies({ eventId, lots }: { eventId: string; lots: Lot[] }) {
  const [name, setName] = useState('')
  const [lotId, setLotId] = useState('')
  const [catId, setCatId] = useState('')
  const [cats, setCats] = useState<{ id: string; name: string }[]>([])
  const [msg, setMsg] = useState('')
  useEffect(() => {
    pget('courtesy-categories').then((r) => r.ok && setCats(r.data.categories ?? []))
  }, [])
  async function give() {
    if (!catId) {
      setMsg('Escolha a categoria da cortesia.')
      return
    }
    const r = await ppost(`events/${eventId}/guests`, { name, lot_id: lotId || lots[0]?.id, courtesy_category_id: catId })
    setMsg(r.ok ? 'Cortesia emitida.' : r.data?.error || 'Falhou.')
    setName('')
  }
  return (
    <Section title="Cortesias">
      <div className="flex flex-wrap items-center gap-2">
        <input placeholder="Nome do convidado" value={name} onChange={(e) => setName(e.target.value)} className={`${inp} flex-1`} />
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className={inp}>
          <option value="">Categoria…</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={lotId} onChange={(e) => setLotId(e.target.value)} className={inp}>
          <option value="">Lote…</option>
          {lots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <Button size="sm" disabled={!name} onClick={give}>Emitir</Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
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
      </div>
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
  const pending = (d.commitments ?? []).filter((c: any) => c.status === 'nao_cumprido')

  return (
    <Section title="Comprovação de público">
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
