import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { EventCardLink } from '@/components/event-card'
import { CatalogError } from '@/components/catalog-error'
import { fetchEvents, fetchCategories } from '@/lib/api'
import { categoryName, formatDate } from '@/lib/format'

export const revalidate = 60

export const metadata = {
  title: 'Eventos',
  description: 'Descubra shows, festas, teatro e mais. Filtre por categoria, cidade e data.',
}

type SP = Promise<{ q?: string; category?: string; city?: string; from?: string; to?: string; page?: string }>

// Diretório: renderizado no servidor (indexável), com filtros por categoria/cidade/data.
// Estados vazios contextuais: sem filtro (catálogo vazio real) vs. filtro sem resultado.
export default async function EventosPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const [events, categories] = await Promise.all([
    fetchEvents({ q: sp.q, category: sp.category, city: sp.city, from: sp.from, to: sp.to, page }),
    fetchCategories(),
  ])
  const catalogError = events.error || categories.error
  const list = events.data

  const filters = (
    [
      sp.q && { key: 'q', label: 'Busca', value: sp.q },
      sp.category && { key: 'category', label: 'Categoria', value: categoryName(sp.category) },
      sp.city && { key: 'city', label: 'Cidade', value: sp.city },
      sp.from && { key: 'from', label: 'De', value: formatDate(sp.from) },
      sp.to && { key: 'to', label: 'Até', value: formatDate(sp.to) },
    ] as const
  ).filter((f): f is { key: string; label: string; value: string } => Boolean(f))
  const hasFilters = filters.length > 0

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <h1 className="font-display text-3xl font-bold">Eventos</h1>

        <form className="mt-5 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
            <Search className="size-4 text-muted-foreground" />
            <input name="q" defaultValue={sp.q} placeholder="Buscar…" aria-label="Buscar"
              className="h-11 flex-1 bg-transparent text-sm outline-none" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <select name="category" defaultValue={sp.category ?? ''} aria-label="Categoria"
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm">
              <option value="">Todas categorias</option>
              {categories.data.map((c) => (
                <option key={c.slug} value={c.slug}>{categoryName(c.slug)}</option>
              ))}
            </select>
            <input name="city" defaultValue={sp.city} placeholder="Cidade" aria-label="Cidade"
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm" />
            <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm">
              <span className="text-muted-foreground">De</span>
              <input name="from" type="date" defaultValue={sp.from} aria-label="De (data)"
                className="w-full bg-transparent text-sm outline-none" />
            </label>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm">
              <span className="text-muted-foreground">Até</span>
              <input name="to" type="date" defaultValue={sp.to} aria-label="Até (data)"
                className="w-full bg-transparent text-sm outline-none" />
            </label>
            <button className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground">
              Filtrar
            </button>
          </div>
        </form>

        {/* Filtros ativos + limpar */}
        {hasFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtros:</span>
            {filters.map((f) => (
              <Link
                key={f.key}
                href={clearHref(sp, f.key)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm hover:bg-secondary"
              >
                {f.label}: <span className="font-medium">{f.value}</span>
                <X className="size-3 text-muted-foreground" />
              </Link>
            ))}
            <Link href="/eventos" className="text-sm text-primary">
              Limpar tudo
            </Link>
          </div>
        )}

        {list.length > 0 && !catalogError && (
          <p className="mt-4 text-sm text-muted-foreground">
            {list.length} {list.length === 1 ? 'evento' : 'eventos'}
          </p>
        )}

        <div className="mt-6">
          {catalogError ? (
            <CatalogError />
          ) : list.length === 0 ? (
            hasFilters ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <p className="text-muted-foreground">Nenhum evento para esses filtros.</p>
                <Link href="/eventos" className="mt-4 inline-block rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary">
                  Limpar filtros
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <p className="text-muted-foreground">Ainda não há eventos publicados.</p>
                <Link href="/para-produtores" className="mt-4 inline-block text-sm text-primary">
                  Produzo eventos →
                </Link>
              </div>
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((e) => (
                <EventCardLink key={e.event_id} event={e} />
              ))}
            </div>
          )}
        </div>

        {(page > 1 || list.length >= 24) && (
          <nav className="mt-8 flex items-center justify-between">
            {page > 1 ? (
              <Link href={pageHref(sp, page - 1)} className="rounded-lg border border-border px-4 py-2 text-sm">
                ← Anterior
              </Link>
            ) : <span />}
            {list.length >= 24 && (
              <Link href={pageHref(sp, page + 1)} className="rounded-lg border border-border px-4 py-2 text-sm">
                Próxima →
              </Link>
            )}
          </nav>
        )}
      </main>
    </>
  )
}

function pageHref(sp: Record<string, string | undefined>, page: number): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) if (v && k !== 'page') qs.set(k, v)
  qs.set('page', String(page))
  return `/eventos?${qs.toString()}`
}

function clearHref(sp: Record<string, string | undefined>, key: string): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) if (v && k !== key && k !== 'page') qs.set(k, v)
  const s = qs.toString()
  return s ? `/eventos?${s}` : '/eventos'
}
