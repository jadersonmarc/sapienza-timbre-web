'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminNav } from '@/components/admin-nav'
import { Button } from '@/components/ui/button'
import { aget, apost } from '@/lib/admin'

type Artist = { id: string; name: string; slug: string; category?: string; status: string }

export default function ArtistasPage() {
  const router = useRouter()
  const [artists, setArtists] = useState<Artist[] | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)

  function load() {
    aget('artists?all=true').then((r) => {
      if (r.status === 401) return router.replace('/admin/entrar')
      setArtists(r.data.artists ?? [])
    })
  }
  useEffect(load, [router])

  async function create() {
    if (!name.trim()) return
    setBusy(true)
    const r = await apost('artists', { name: name.trim(), category: category.trim() || null })
    setBusy(false)
    if (r.ok) {
      setName('')
      setCategory('')
      load()
    }
  }

  async function toggle(a: Artist) {
    const status = a.status === 'suspended' ? 'active' : 'suspended'
    const r = await apost(`artists/${a.id}/status`, { status })
    if (r.ok) load()
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Artistas</h1>

        <div className="mt-5 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do artista"
            className="h-11 flex-1 rounded-lg border border-border bg-card px-3" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoria"
            className="h-11 w-40 rounded-lg border border-border bg-card px-3" />
          <Button disabled={busy || !name.trim()} onClick={create}>Criar</Button>
        </div>

        <div className="mt-6 space-y-2">
          {artists === null && <p className="text-muted-foreground">Carregando…</p>}
          {artists?.length === 0 && <p className="text-muted-foreground">Nenhum artista no catálogo.</p>}
          {artists?.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-sm text-muted-foreground">{a.slug}{a.category ? ` · ${a.category}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                {a.status === 'suspended' && <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive">Suspenso</span>}
                <Button variant="outline" size="sm" onClick={() => toggle(a)}>
                  {a.status === 'suspended' ? 'Reativar' : 'Suspender'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
