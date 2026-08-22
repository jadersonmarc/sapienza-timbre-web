import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BadgeCheck, FileCheck2, ShieldCheck, Printer, Link2 } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { PrintButton } from '@/components/print-button'
import { fetchAttestation } from '@/lib/api'
import type { Attestation, AttestationCommitment } from '@/lib/types'

export const revalidate = 60

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params
  const a = await fetchAttestation(id)
  return {
    title: a ? `Atestado · ${a.payload.event.name}` : 'Atestado de evento',
    description: 'Atestado público e verificável do fechamento de um evento Timbre.',
  }
}

const EXPLORER = process.env.NEXT_PUBLIC_BLOCK_EXPLORER

export default async function AttestationPage({ params }: { params: Params }) {
  const { id } = await params
  const a = await fetchAttestation(id)
  if (!a) notFound()
  const p = a.payload

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-10 print:max-w-none">
        {/* Cabeçalho do atestado */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-primary">
              <FileCheck2 className="size-5" />
              <span className="font-display text-sm font-semibold uppercase tracking-wide">Atestado de evento</span>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs">versão {a.version}</span>
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold">{p.event.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.event.producer} · {p.event.city}
          </p>
          {a.superseded_by && (
            <div className="mt-4 rounded-lg bg-signal/10 p-3 text-sm text-signal">
              Este atestado foi substituído.{' '}
              <Link href={`/a/${a.superseded_by}`} className="font-medium underline">
                Ver a versão vigente →
              </Link>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <BadgeCheck className="size-4 text-primary" />
            Registro canônico assinado (Ed25519) — sem dado pessoal.
          </div>
          <div className="mt-2 print:hidden">
            <PrintButton />
          </div>
        </div>

        {/* Relatório de público */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Público</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Ingressos vendidos" value={p.sales.tickets_sold} />
            <Stat label="Presentes" value={p.attendance.present} />
            <Stat label="Ausentes" value={p.attendance.absent} />
            <Stat label="Comparecimento" value={`${p.attendance.rate_pct}%`} />
          </dl>

          <h3 className="mt-5 text-sm font-medium">Vendidos por lote</h3>
          <ul className="mt-2 divide-y divide-border text-sm">
            {p.sales.by_lot.map((l) => (
              <li key={l.lot_id} className="flex justify-between py-1.5">
                <span>{l.name}</span>
                <span className="text-muted-foreground">{l.sold}</span>
              </li>
            ))}
          </ul>

          {p.sales.by_sector.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-medium">Ocupação por setor</h3>
              <ul className="mt-2 divide-y divide-border text-sm">
                {p.sales.by_sector.map((s) => (
                  <li key={s.sector_id} className="flex justify-between py-1.5">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">{s.sold}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="mt-4 text-sm font-medium">Cortesias por categoria</h3>
          <ul className="mt-2 divide-y divide-border text-sm">
            {p.courtesy.issued.map((c) => {
              const used = p.courtesy.used.find((u) => u.category === c.category)?.count ?? 0
              return (
                <li key={c.category} className="flex justify-between py-1.5">
                  <span>{c.category}</span>
                  <span className="text-muted-foreground">emitidas {c.count} · usadas {used}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Reentradas: {p.attendance.reentries}</p>
        </section>

        {/* Relatório de contrapartida */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Contrapartida</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Meia-entrada: {p.half_price.granted} concedidas de cota {p.half_price.quota}.
          </p>
          {p.commitments.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum compromisso declarado.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border text-sm">
              {p.commitments.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium">{commitmentLabel(c)}</p>
                    {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                  </div>
                  <CommitmentStatus c={c} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Verificação */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Verificação</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Qualquer pessoa pode recalcular o resumo: é o SHA-256 da serialização canônica (JSON
            com ordem fixa de campos, publicada abaixo). A assinatura é Ed25519 sobre o resumo.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <Field label="Formato" value={`v${a.format_version}`} />
            <Field label="Chave" value={`${a.key_id} (Ed25519)`} />
            <Field label="Resumo (SHA-256)" value={a.digest} mono />
            <Field label="Chave pública" value={a.public_key} mono />
            <Field label="Assinatura" value={a.signature} mono />
            {a.anchor.status !== 'none' && (
              <Field label="Âncora" value={a.anchor.status} />
            )}
          </dl>
          {a.anchor.status === 'anchored' && a.anchor.tx_hash && EXPLORER && (
            <a
              href={`${EXPLORER.replace(/\/$/, '')}/tx/${a.anchor.tx_hash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary"
            >
              <Link2 className="size-4" /> Ver no explorador de blocos
            </a>
          )}
          <details className="mt-5">
            <summary className="cursor-pointer text-sm text-muted-foreground">Serialização canônica</summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-secondary p-3 text-xs break-all">{a.serialization}</pre>
          </details>
        </section>
      </main>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-bold">{value}</dd>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}

const KIND_LABEL: Record<string, string> = {
  courtesy_share: 'Cota de cortesia',
  meia_entrada_cota: 'Cota de meia-entrada',
  free_admission: 'Gratuidade',
  custom: 'Outro compromisso',
}

function commitmentLabel(c: AttestationCommitment) {
  const base = KIND_LABEL[c.kind] ?? c.kind
  const cat = c.category ? ` (${c.category})` : ''
  const target = c.target_type === 'percent' ? `${c.target_value}%` : c.target_value
  return `${base}${cat} — meta ${target}`
}

function CommitmentStatus({ c }: { c: AttestationCommitment }) {
  if (c.realized === '' || c.target_value === '') return null
  const real = parseFloat(c.realized)
  const target = parseFloat(c.target_value)
  const ok = real >= target
  return (
    <span className={`rounded-full px-3 py-1 text-xs ${ok ? 'bg-primary/10 text-primary' : 'bg-signal/10 text-signal'}`}>
      {ok ? 'cumprido' : 'não cumprido'} · {c.realized}/{c.target_value}
    </span>
  )
}
