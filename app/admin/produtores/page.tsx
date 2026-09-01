'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminNav } from '@/components/admin-nav'
import { Button } from '@/components/ui/button'
import { aget, apost } from '@/lib/admin'

type Producer = { id: string; name: string; status: string; created_at: string }

const STATUS: Record<string, string> = { active: 'Ativo', pending: 'Pendente', suspended: 'Suspenso' }

export default function ProdutoresPage() {
  const router = useRouter()
  const [prods, setProds] = useState<Producer[] | null>(null)

  function load() {
    aget('producers').then((r) => {
      if (r.status === 401) return router.replace('/admin/entrar')
      setProds(r.data.producers ?? [])
    })
  }
  useEffect(load, [router])

  async function toggle(p: Producer) {
    const action = p.status === 'suspended' ? 'approve' : 'suspend'
    const r = await apost(`producers/${p.id}/${action}`)
    if (r.ok) load()
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Produtores</h1>
        <div className="mt-5 space-y-2">
          {prods === null && <p className="text-muted-foreground">Carregando…</p>}
          {prods?.length === 0 && <p className="text-muted-foreground">Nenhum produtor cadastrado.</p>}
          {prods?.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">Desde {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">{STATUS[p.status] ?? p.status}</span>
                <Button variant="outline" size="sm" onClick={() => toggle(p)}>
                  {p.status === 'suspended' ? 'Reativar' : 'Suspender'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
