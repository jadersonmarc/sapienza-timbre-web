import Link from 'next/link'
import { Search } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { EventCardLink } from '@/components/event-card'
import { CatalogError } from '@/components/catalog-error'
import { fetchEvents, fetchCategories } from '@/lib/api'
import { categoryName } from '@/lib/format'

export const revalidate = 60

export const metadata = {
  title: 'Eventos',
  description: 'Descubra shows, festas, teatro e mais. Filtre por categoria, cidade e data.',
}

type SP = Promise<{ q?: string; category?: string; city?: string; from?: string; to?: string; page?: string }>

// Diretório: renderizado no servidor (indexável), com filtros por categoria/cidade/data.
export default async function EventosPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const [events, categories] = await Promise.all([
    fetchEvents({ q: sp.q, category: sp.category, city: sp.city, from: sp.from, to: sp.to, page }),
    fetchCategories(),
  ])
  const catalogError = events.error || categories.error
  const list = events.data

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <h1 className="font-display text-3xl font-bold">Eventos</h1>

        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
            <Search className="size-4 text-muted-foreground" />
            <input name="q" defaultValue={sp.q} placeholder="Buscar…" aria-label="Buscar"
              className="h-11 flex-1 bg-transparent text-sm outline-none" />
          </div>
          <select name="category" defaultValue={sp.category ?? ''} aria-label="Categoria"
            className="h-11 rounded-xl border border-border bg-card px-3 text-sm">
            <option value="">Todas categorias</option>
            {categories.data.map((c) => (
              <option key={c.slug} value={c.slug}>{categoryName(c.slug)}</option>
            ))}
          </select>
          <input name="city" defaultValue={sp.city} placeholder="Cidade" aria-label="Cidade"
            className="h-11 rounded-xl border border-border bg-card px-3 text-sm" />
          <button className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground">
            Filtrar
          </button>
        </form>

        <div className="mt-8">
          {catalogError ? (
            <CatalogError />
          ) : list.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Nenhum evento encontrado. Ajuste os filtros.
            </p>
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
