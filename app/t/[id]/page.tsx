import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BadgeCheck, ShieldAlert, Ticket } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { ShareButton } from '@/components/share-button'
import { fetchToken, fetchTokenMetadata } from '@/lib/api'

export const revalidate = 30

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params
  const meta = await fetchTokenMetadata(id)
  return {
    title: meta ? `Prova · ${meta.name}` : 'Prova de ingresso',
    description: 'Prova de propriedade verificável de um ingresso Timbre.',
  }
}

const LIFECYCLE: Record<string, { label: string; tone: 'ok' | 'muted' | 'warn' }> = {
  intransferivel: { label: 'Válido · intransferível por ora', tone: 'ok' },
  transferivel: { label: 'Válido · transferível', tone: 'ok' },
  utilizado: { label: 'Utilizado (presença registrada)', tone: 'muted' },
  queimado: { label: 'Cancelado', tone: 'warn' },
  transferido: { label: 'Transferido', tone: 'muted' },
  cancelado: { label: 'Cancelado', tone: 'warn' },
}

// Prova de propriedade PÚBLICA e compartilhável (Onda 2) — abre sem conta e sem app. O
// estado é calculado ao vivo; os metadados não têm dado pessoal.
export default async function TokenPage({ params }: { params: Params }) {
  const { id } = await params
  const [token, meta] = await Promise.all([fetchToken(id), fetchTokenMetadata(id)])
  if (!token || !meta) notFound()
  const life = LIFECYCLE[token.state.lifecycle] ?? { label: token.state.lifecycle, tone: 'muted' as const }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 pb-20 pt-10">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-primary">
            <Ticket className="size-5" />
            <span className="font-display text-sm font-semibold uppercase tracking-wide">Ingresso Timbre</span>
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold">{meta.name}</h1>

          {meta.attributes && meta.attributes.length > 0 && (
            <dl className="mt-5 grid grid-cols-2 gap-3">
              {meta.attributes.map((a, i) => (
                <div key={i} className="rounded-lg bg-secondary p-3">
                  <dt className="text-xs text-muted-foreground">{a.trait_type}</dt>
                  <dd className="mt-0.5 text-sm font-medium">{String(a.value)}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className={`mt-5 flex items-center gap-2 rounded-lg p-3 text-sm ${
            life.tone === 'warn' ? 'bg-destructive/10 text-destructive' : life.tone === 'muted' ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'
          }`}>
            {life.tone === 'warn' ? <ShieldAlert className="size-4" /> : <BadgeCheck className="size-4" />}
            {life.label}
          </div>

          {token.state.disputed && (
            <p className="mt-2 text-xs text-signal">Este ingresso está em disputa.</p>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Prova verificável emitida pelo Timbre. Não contém dados pessoais.
          </p>

          <div className="mt-5 flex gap-2">
            <ShareButton title={meta.name} />
            <Link href="/eventos" className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Ver eventos
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
