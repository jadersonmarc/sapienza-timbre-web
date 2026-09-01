import { notFound } from 'next/navigation'
import { CalendarDays, MapPin, ShieldAlert, Info } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { CheckoutPanel } from '@/components/checkout-panel'
import { TrustBadges } from '@/components/trust'
import { RichText, plainText } from '@/components/rich-text'
import { fetchEvent, fetchConfig } from '@/lib/api'
import { categoryName, formatDateTime } from '@/lib/format'

export const revalidate = 60

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params
  const detail = await fetchEvent(id)
  if (!detail) return { title: 'Evento não encontrado' }
  const e = detail.event
  return {
    title: e.title,
    description: e.description
      ? plainText(e.description).slice(0, 160)
      : (e.subtitle ?? `Ingressos para ${e.title}. Compre pelo Timbre.`),
    openGraph: { title: e.title, type: 'website' },
  }
}

// Página do evento — a "página de dinheiro": SSR+ISR, dados estruturados, e o caminho de
// compra. Saldo/lote corrente são voláteis e o painel de compra os revalida no cliente.
export default async function EventoPage({ params }: { params: Params }) {
  const { id } = await params
  const [detail, config] = await Promise.all([fetchEvent(id), fetchConfig()])
  if (!detail) notFound()
  const e = detail.event

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    startDate: e.starts_at,
    endDate: e.ends_at,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    description: e.description ? plainText(e.description) : undefined,
    image: e.cover_url ? [e.cover_url] : undefined,
    location: e.address
      ? { '@type': 'Place', name: e.venue_name ?? e.city ?? e.address, address: e.address }
      : undefined,
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-24">
        {/* Herói dominado pela imagem do evento (§6). */}
        <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl bg-secondary sm:aspect-[21/9]">
          {e.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.cover_url} alt={e.title} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <CalendarDays className="size-10" />
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            {e.category && (
              <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
                {categoryName(e.category)}
              </span>
            )}
            <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{e.title}</h1>
            {e.subtitle && (
              <p className="mt-2 text-lg text-muted-foreground">{e.subtitle}</p>
            )}

            <div className="mt-4 space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                {formatDateTime(e.starts_at)}
              </p>
              {(e.city || e.address) && (
                <p className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  {[e.venue_name, e.address, e.city].filter(Boolean).join(' — ')}
                </p>
              )}
              {e.age_rating && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <ShieldAlert className="size-4" /> Classificação: {e.age_rating}
                </p>
              )}
            </div>

            {e.description && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-semibold">Sobre o evento</h2>
                {/* Marcação do produtor renderizada por NÓS, de um conjunto fechado de
                    elementos — o texto dele nunca vira HTML nosso. */}
                <RichText text={e.description} className="mt-3 text-sm leading-relaxed" />
              </section>
            )}

            {e.terms && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-semibold">Informações importantes</h2>
                <RichText text={e.terms} className="mt-3 text-sm leading-relaxed text-muted-foreground" />
              </section>
            )}

            {(e.address || e.city) && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-semibold">Local</h2>
                <p className="mt-2 text-sm">{[e.address, e.city].filter(Boolean).join(' — ')}</p>
                {/* "Como chegar" abre no app que a pessoa já usa. Sem isso, o endereço vira
                    algo para copiar à mão no celular, na porta do evento. */}
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <a className="text-primary underline underline-offset-2" target="_blank"
                     rel="noopener noreferrer"
                     href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery(e))}`}>
                    Google Maps
                  </a>
                  <a className="text-primary underline underline-offset-2" target="_blank"
                     rel="noopener noreferrer"
                     href={`https://waze.com/ul?q=${encodeURIComponent(mapQuery(e))}&navigate=yes`}>
                    Waze
                  </a>
                </div>
              </section>
            )}

            {detail.producer?.name && (
              <section className="mt-8 rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Apresentado por</p>
                <p className="mt-1 font-medium">{detail.producer.name}</p>
              </section>
            )}

            <div className="mt-6">
              <TrustBadges />
            </div>

            {e.cancellation_policy && (
              <div className="mt-6 rounded-xl border border-border p-4 text-sm">
                <p className="mb-1 flex items-center gap-2 font-medium">
                  <Info className="size-4" /> Política de cancelamento
                </p>
                <p className="text-muted-foreground">{e.cancellation_policy}</p>
              </div>
            )}
          </div>

          {/* Caminho de compra (client — trata hold, Pix e voláteis). */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <CheckoutPanel detail={detail} config={config} />
          </aside>
        </div>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}

/** mapQuery é o melhor alvo de mapa que temos: coordenada quando existe, endereço quando não. */
function mapQuery(e: { address?: string; city?: string; lat?: number; lng?: number }) {
  if (typeof e.lat === 'number' && typeof e.lng === 'number') return `${e.lat},${e.lng}`
  return [e.address, e.city].filter(Boolean).join(', ')
}
