'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminNav } from '@/components/admin-nav'
import { aget } from '@/lib/admin'

type Sales = { tickets_sold?: number; gross_cents?: number; face_cents?: number; platform_fee_cents?: number }
type AuditEntry = { id: string; action: string; entity_type?: string; created_at: string }

export default function RelatoriosPage() {
  const router = useRouter()
  const [sales, setSales] = useState<Sales>({})
  const [audit, setAudit] = useState<AuditEntry[] | null>(null)

  useEffect(() => {
    aget('reports/sales').then((r) => {
      if (r.status === 401) return router.replace('/admin/entrar')
      setSales(r.data)
    })
    aget('audit-log?limit=200').then((r) => r.ok && setAudit(r.data.entries ?? []))
  }, [router])

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Relatórios</h1>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Stat label="Ingressos vendidos" value={sales.tickets_sold ?? 0} />
          <Stat label="Bruto cobrado" value={brl(sales.gross_cents)} />
          <Stat label="Face (produtores)" value={brl(sales.face_cents)} />
          <Stat label="Taxa da plataforma" value={brl(sales.platform_fee_cents)} />
        </div>

        <h2 className="mt-10 font-display text-lg font-bold">Trilha de auditoria</h2>
        <div className="mt-3 space-y-2">
          {audit === null && <p className="text-muted-foreground">Carregando…</p>}
          {audit?.length === 0 && <p className="text-muted-foreground">Nenhuma ação registrada.</p>}
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
