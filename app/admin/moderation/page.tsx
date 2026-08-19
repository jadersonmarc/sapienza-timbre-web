'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminNav } from '@/components/admin-nav'
import { Button } from '@/components/ui/button'
import { aget, apatch } from '@/lib/admin'

type Flag = { id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string }

export default function ModerationPage() {
  const router = useRouter()
  const [flags, setFlags] = useState<Flag[] | null>(null)

  function load() {
    aget('moderation/queue').then((r) => {
      if (r.status === 401) return router.replace('/admin/entrar')
      setFlags(r.data.flags ?? [])
    })
  }
  useEffect(load, [router])

  async function resolve(f: Flag, status: 'resolved' | 'dismissed') {
    const r = await apatch(`moderation/${f.id}`, { status })
    if (r.ok) load()
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Moderação</h1>
        <p className="mt-1 text-sm text-muted-foreground">Denúncias pendentes (moderação reativa).</p>
        <div className="mt-5 space-y-2">
          {flags === null && <p className="text-muted-foreground">Carregando…</p>}
          {flags?.length === 0 && <p className="text-muted-foreground">Fila vazia.</p>}
          {flags?.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">{f.target_type}</span>
                <span className="text-sm text-muted-foreground">{new Date(f.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <p className="mt-2">{f.reason}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{f.target_id}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => resolve(f, 'resolved')}>Resolver</Button>
                <Button size="sm" variant="ghost" onClick={() => resolve(f, 'dismissed')}>Arquivar</Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
