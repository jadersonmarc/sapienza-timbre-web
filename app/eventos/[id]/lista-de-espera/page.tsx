'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { BellRing, Check } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { joinWaitlist } from '@/lib/client'

// Lista de espera do evento esgotado: captura interesse; o backend avisa na virada de lote.
export default function ListaDeEsperaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!email) return
    setBusy(true)
    const ok = await joinWaitlist(id, email)
    setBusy(false)
    if (ok) setDone(true)
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 pt-16">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
          <BellRing className="size-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Lista de espera</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esgotou por enquanto. Deixe seu e-mail e avisamos assim que abrir um novo lote.
        </p>

        {done ? (
          <div className="mt-6 rounded-xl bg-primary/10 p-4 text-sm">
            <Check className="mb-2 size-6 text-primary" />
            Pronto! Você está na lista. Fique de olho no seu e-mail.
            <Link href={`/eventos/${id}`} className="mt-3 block text-primary">
              ← Voltar ao evento
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="h-12 w-full rounded-lg border border-border bg-card px-3"
            />
            <Button size="lg" className="w-full" disabled={busy || !email} onClick={submit}>
              {busy ? 'Enviando…' : 'Avise-me'}
            </Button>
          </div>
        )}
      </main>
    </>
  )
}
