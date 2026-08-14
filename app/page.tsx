import Link from 'next/link'
import { ArrowRight, Search, Ticket, Store, Mic2 } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { EventCardLink } from '@/components/event-card'
import { fetchEvents, fetchCategories } from '@/lib/api'
import { categoryName } from '@/lib/format'

export const revalidate = 60

// Home: três portas explícitas (quem sai, quem produz, quem é artista) + destaques + busca.
export default async function HomePage() {
  const [events, categories] = await Promise.all([fetchEvents({ page: 1 }), fetchCategories()])
  const highlights = events.slice(0, 6)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-20">
        {/* Herói + busca */}
        <section className="py-12 sm:py-16">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            O que você quer viver hoje?
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Shows, festas, teatro e muito mais. Ingresso em poucos toques, QR no celular — funciona
            até sem sinal na porta.
          </p>
          <form action="/eventos" className="mt-6 flex max-w-md items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                name="q"
                aria-label="Buscar eventos"
                placeholder="Buscar por evento, artista…"
                className="h-11 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <button className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground">
              Buscar
            </button>
          </form>
        </section>

        {/* Três portas */}
        <section className="grid gap-3 sm:grid-cols-3">
          <DoorCard href="/eventos" icon={<Ticket className="size-5" />} title="Quero sair" desc="Encontre o próximo rolê e garanta seu ingresso." />
          <DoorCard href="/para-produtores" icon={<Store className="size-5" />} title="Produzo eventos" desc="Venda ingressos e gerencie sua bilheteria." />
          <DoorCard href="/para-produtores" icon={<Mic2 className="size-5" />} title="Sou artista" desc="Venda os ingressos dos seus próprios shows." />
        </section>

        {/* Categorias */}
        {categories.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 font-display text-xl font-semibold">Categorias</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/eventos?category=${c.slug}`}
                  className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
                >
                  {categoryName(c.slug)}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Destaques */}
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Em destaque</h2>
            <Link href="/eventos" className="flex items-center gap-1 text-sm text-primary">
              Ver tudo <ArrowRight className="size-4" />
            </Link>
          </div>
          {highlights.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              Nenhum evento publicado ainda. Volte em breve.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((e) => (
                <EventCardLink key={e.event_id} event={e} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}

function DoorCard({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary">
      <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</div>
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  )
}
