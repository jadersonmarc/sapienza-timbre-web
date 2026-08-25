'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, CalendarDays } from 'lucide-react'
import { ProducerNav } from '@/components/producer-nav'
import { ReceivingAccount } from '@/components/receiving-account'
import { Button } from '@/components/ui/button'
import { pget } from '@/lib/producer'
import { formatDate, categoryName } from '@/lib/format'

type Ev = { id: string; title: string; category: string; status: string; starts_at?: string }
type Summary = { events_active?: number; tickets_sold?: number; gross_cents?: number }

const STATUS: Record<string, string> = {
  draft: 'Rascunho', pending_review: 'Em análise', published: 'Publicado',
  suspended: 'Suspenso', finished: 'Encerrado', cancelled: 'Cancelado',
}

export default function PainelPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Ev[] | null>(null)
  const [summary, setSummary] = useState<Summary>({})

  useEffect(() => {
    pget('events').then((r) => {
      if (r.status === 401) return router.replace('/painel/entrar')
      setEvents(r.data.events ?? [])
    })
    pget('dash/summary').then((r) => r.ok && setSummary(r.data))
  }, [router])

  return (
    <>
      <ProducerNav />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8">
        {/* Antes da lista: sem recebimento configurado nada é publicado, e descobrir isso no
            clique de publicar é tarde. */}
        <ReceivingAccount />
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Seus eventos</h1>
          <Link href="/painel/eventos/novo">
            <Button><Plus className="size-4" /> Novo evento</Button>
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Eventos publicados" value={summary.events_active ?? 0} />
          <Stat label="Ingressos vendidos" value={summary.tickets_sold ?? 0} />
          <Stat label="Vendas (face)" value={brl(summary.gross_cents)} />
        </div>

        <div className="mt-8 space-y-3">
          {events === null && <p className="text-muted-foreground">Carregando…</p>}
          {events?.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <p className="text-muted-foreground">Você ainda não criou eventos.</p>
              <Link href="/painel/eventos/novo" className="mt-4 inline-block"><Button>Criar o primeiro</Button></Link>
            </div>
          )}
          {events?.map((e) => (
            <Link key={e.id} href={`/painel/eventos/${e.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" /> {formatDate(e.starts_at)} · {categoryName(e.category)}
                </p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs">{STATUS[e.status] ?? e.status}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  )
}

function brl(cents?: number) {
  return ((cents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
