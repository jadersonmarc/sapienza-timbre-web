'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminNav } from '@/components/admin-nav'
import { aget } from '@/lib/admin'

type Summary = {
  producers_total?: number
  producers_pending?: number
  events_active?: number
  revenue_today_cents?: number
}
type Sales = {
  tickets_sold?: number
  gross_cents?: number
  face_cents?: number
  platform_fee_cents?: number
}
type AuditEntry = { id: string; action: string; entity_type?: string; created_at: string }

export default function AdminPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<Summary>({})
  const [sales, setSales] = useState<Sales>({})
  const [audit, setAudit] = useState<AuditEntry[] | null>(null)

  useEffect(() => {
    aget('summary').then((r) => {
      if (r.status === 401) return router.replace('/admin/entrar')
      setSummary(r.data)
    })
    aget('reports/sales').then((r) => r.ok && setSales(r.data))
    aget('audit-log?limit=12').then((r) => r.ok && setAudit(r.data.entries ?? []))
  }, [router])

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Visão geral</h1>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Produtores" value={summary.producers_total ?? 0} sub={`${summary.producers_pending ?? 0} pendentes`} />
          <Stat label="Eventos publicados" value={summary.events_active ?? 0} />
          <Stat label="Ingressos vendidos" value={sales.tickets_sold ?? 0} />
          <Stat label="Faturamento hoje (taxa)" value={brl(summary.revenue_today_cents)} />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat label="Bruto (total cobrado)" value={brl(sales.gross_cents)} />
          <Stat label="Face (repasse produtor)" value={brl(sales.face_cents)} />
          <Stat label="Taxa da plataforma" value={brl(sales.platform_fee_cents)} />
        </div>

        <h2 className="mt-10 font-display text-lg font-bold">Atividade recente</h2>
        <div className="mt-3 space-y-2">
          {audit === null && <p className="text-muted-foreground">Carregando…</p>}
          {audit?.length === 0 && <p className="text-muted-foreground">Nenhuma ação administrativa ainda.</p>}
          {audit?.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2 text-sm">
              <span className="font-mono text-xs">{e.action}</span>
              <span className="text-muted-foreground">{e.entity_type ?? ''}</span>
              <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString('pt-BR')}</span>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function brl(cents?: number) {
  return ((cents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
