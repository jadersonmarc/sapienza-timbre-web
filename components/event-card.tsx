import Link from 'next/link'
import { CalendarDays, MapPin } from 'lucide-react'
import type { EventCard } from '@/lib/types'
import { brl, categoryName, formatDate } from '@/lib/format'

// Card do diretório — a imagem do evento domina; o texto é chrome (§6).
export function EventCardLink({ event }: { event: EventCard }) {
  return (
    <Link
      href={`/eventos/${event.event_id}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary"
    >
      <div className="relative aspect-[3/2] bg-secondary">
        {event.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_url}
            alt={event.title}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <CalendarDays className="size-8" />
          </div>
        )}
        {event.category && (
          <span className="absolute left-2 top-2 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium backdrop-blur">
            {categoryName(event.category)}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 font-display font-semibold">{event.title}</h3>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" />
          <span className="truncate">{formatDate(event.starts_at)}</span>
        </div>
        {event.city && (
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{event.city}</span>
          </div>
        )}
        {event.min_price_cents !== undefined && (
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">a partir de </span>
            <span className="font-semibold text-primary">{brl(event.min_price_cents)}</span>
          </p>
        )}
      </div>
    </Link>
  )
}
