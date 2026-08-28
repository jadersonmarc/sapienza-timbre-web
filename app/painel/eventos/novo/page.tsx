'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ProducerNav } from '@/components/producer-nav'
import { RichEditor } from '@/components/rich-editor'
import { Button } from '@/components/ui/button'
import { pget, ppost, uploadCover } from '@/lib/producer'
import { categoryName } from '@/lib/format'

export default function NovoEventoPage() {
  const router = useRouter()
  const [cats, setCats] = useState<{ slug: string }[]>([])
  const [f, setF] = useState({
    title: '', subtitle: '', description: '', category: '', starts_at: '',
    city: '', address: '', age_rating: '', terms: '', cover_url: '', has_seat_map: false,
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    pget('categories').then((r) => {
      if (r.status === 401) return router.replace('/painel/entrar')
      setCats(r.data.categories ?? [])
    })
  }, [router])

  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))

  async function submit() {
    setError('')
    if (!f.title || !f.category || !f.starts_at) {
      setError('Preencha título, categoria e data de início.')
      return
    }
    setBusy(true)
    const r = await ppost('events', {
      title: f.title,
      category: f.category,
      starts_at: new Date(f.starts_at).toISOString(),
      subtitle: f.subtitle || undefined,
      description: f.description || undefined,
      city: f.city || undefined,
      address: f.address || undefined,
      age_rating: f.age_rating || undefined,
      terms: f.terms || undefined,
      cover_url: f.cover_url || undefined,
      has_seat_map: f.has_seat_map,
    })
    if (r.ok) {
      // Capa é opcional: se o produtor escolheu um arquivo, sobe depois de criar o evento.
      if (coverFile) await uploadCover(r.data.id, coverFile)
      router.push(`/painel/eventos/${r.data.id}`)
      return
    }
    setBusy(false)
    setError(r.data?.error || 'Não foi possível criar o evento.')
  }

  return (
    <>
      <ProducerNav />
      <main className="mx-auto max-w-lg px-4 pb-20 pt-8">
        <Link href="/painel" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" /> Voltar
        </Link>
        <h1 className="font-display text-2xl font-bold">Novo evento</h1>
        <div className="mt-6 space-y-3">
          <Field label="Título"><input value={f.title} onChange={(e) => set('title', e.target.value)} className={inp} /></Field>
          <Field label="Subtítulo (opcional)">
            <input value={f.subtitle} maxLength={160} onChange={(e) => set('subtitle', e.target.value)}
              placeholder="Ex.: turnê de despedida · com participação especial" className={inp} />
          </Field>
          <Field label="Categoria">
            <select value={f.category} onChange={(e) => set('category', e.target.value)} className={inp}>
              <option value="">Selecione…</option>
              {cats.map((c) => <option key={c.slug} value={c.slug}>{categoryName(c.slug)}</option>)}
            </select>
          </Field>
          <Field label="Data e hora de início"><input type="datetime-local" value={f.starts_at} onChange={(e) => set('starts_at', e.target.value)} className={inp} /></Field>
          <Field label="Cidade"><input value={f.city} onChange={(e) => set('city', e.target.value)} className={inp} /></Field>
          <Field label="Endereço (opcional)">
            <input value={f.address} onChange={(e) => set('address', e.target.value)}
              placeholder="Rua, número, bairro" className={inp} />
          </Field>
          <Field label="Classificação etária (opcional)">
            <input value={f.age_rating} onChange={(e) => set('age_rating', e.target.value)}
              placeholder="Ex.: 14 anos · Livre" className={inp} />
          </Field>

          <Field label="Sobre o evento">
            <RichEditor value={f.description} onChange={(v) => set('description', v)}
              placeholder={'Conte o que a pessoa vai ver.\n\nAbertura da casa às 19:00 — show às 20:00.\n\n- Acomodações por ordem de chegada'} />
          </Field>
          <Field label="Informações importantes (opcional)">
            <RichEditor value={f.terms} onChange={(v) => set('terms', v)} rows={5} maxLength={2000}
              placeholder={'- Não é permitida a entrada de crianças de colo\n- Não precisa imprimir o ingresso'} />
          </Field>
          <Field label="Imagem de capa (opcional)">
            <input type="file" accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className={`${inp} h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5`} />
            {coverFile && <span className="mt-1 block text-xs text-muted-foreground">{coverFile.name}</span>}
          </Field>
          <Field label="…ou cole uma URL de imagem (opcional)">
            <input value={f.cover_url} onChange={(e) => set('cover_url', e.target.value)} placeholder="https://… (link direto da imagem)" className={inp} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.has_seat_map} onChange={(e) => set('has_seat_map', e.target.checked)} />
            Evento com mapa de assentos (marcados)
          </label>
          {error && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <Button size="lg" className="w-full" disabled={busy} onClick={submit}>{busy ? 'Criando…' : 'Criar evento'}</Button>
        </div>
      </main>
    </>
  )
}

const inp = 'h-11 w-full rounded-lg border border-border bg-card px-3 text-sm'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm text-muted-foreground">{label}</span>{children}</label>
}
