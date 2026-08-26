'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminNav } from '@/components/admin-nav'
import { Button } from '@/components/ui/button'
import { aget, apost } from '@/lib/admin'
import { LineupEditor } from '@/components/lineup-editor'

type Ev = { producer_id: string; producer: string; event_id: string; title: string; category: string; status: string }

const STATUS: Record<string, string> = {
  draft: 'Rascunho', published: 'Publicado', suspended: 'Suspenso',
  finished: 'Encerrado', cancelled: 'Cancelado',
}

export default function EventosPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Ev[] | null>(null)
  // Line-up aberto por evento: a lista fica enxuta e o rateio aparece sob demanda.
  const [aberto, setAberto] = useState('')

  function load() {
    aget('events').then((r) => {
      if (r.status === 401) return router.replace('/admin/entrar')
      setEvents(r.data.events ?? [])
    })
  }
  useEffect(load, [router])

  async function suspend(e: Ev) {
    const r = await apost(`producers/${e.producer_id}/events/${e.event_id}/suspend`)
    if (r.ok) load()
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Eventos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão consolidada de todos os produtores.</p>
        <div className="mt-5 space-y-2">
          {events === null && <p className="text-muted-foreground">Carregando…</p>}
          {events?.length === 0 && <p className="text-muted-foreground">Nenhum evento.</p>}
          {events?.map((e) => (
            <div key={e.event_id} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-muted-foreground">{e.producer} · {e.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs">{STATUS[e.status] ?? e.status}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAberto(aberto === e.event_id ? '' : e.event_id)}
                  >
                    Line-up
                  </Button>
                  {e.status === 'published' && (
                    <Button variant="outline" size="sm" onClick={() => suspend(e)}>Suspender</Button>
                  )}
                </div>
              </div>
              {aberto === e.event_id && <LineupEditor producerId={e.producer_id} eventId={e.event_id} />}
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
