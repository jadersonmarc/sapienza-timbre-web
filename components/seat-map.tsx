'use client'

import { useMemo } from 'react'
import type { PublicSector, PublicSeat } from '@/lib/types'
import { cn } from '@/lib/utils'

// Acima disto, não renderizamos um nó por assento (§4.2): cai na seleção textual (que a
// a11y §4.3 exige de qualquer jeito). Virtualização em canvas fica como refino da Onda 2.
const MAX_RENDER_SEATS = 800

type Props = {
  sectors: PublicSector[]
  occupied: Set<string>
  selected: Set<string>
  onToggle: (seatId: string) => void
}

export function SeatMap({ sectors, occupied, selected, onToggle }: Props) {
  const seated = useMemo(() => sectors.filter((s) => s.kind !== 'standing' && (s.seats?.length ?? 0) > 0), [sectors])
  const total = useMemo(() => seated.reduce((n, s) => n + (s.seats?.length ?? 0), 0), [seated])

  if (seated.length === 0) return null

  return (
    <div className="space-y-6">
      <div aria-hidden className="rounded-lg bg-secondary py-2 text-center text-xs text-muted-foreground">
        PALCO
      </div>

      {total <= MAX_RENDER_SEATS ? (
        seated.map((sec) => (
          <SectorGrid key={sec.id} sector={sec} occupied={occupied} selected={selected} onToggle={onToggle} />
        ))
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          Mapa grande ({total} lugares). Use a seleção por código abaixo.
        </p>
      )}

      {/* Alternativa textual (a11y §4.3) — sempre disponível, e é o caminho em casas grandes. */}
      <TextualPicker sectors={seated} occupied={occupied} selected={selected} onToggle={onToggle} />

      <Legend />
    </div>
  )
}

function SectorGrid({ sector, occupied, selected, onToggle }: { sector: PublicSector } & Omit<Props, 'sectors'>) {
  // Agrupa por fileira (row_label), ordena por número.
  const rows = useMemo(() => {
    const map = new Map<string, PublicSeat[]>()
    for (const s of sector.seats ?? []) {
      const key = s.row_label ?? ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    for (const arr of map.values()) arr.sort((a, b) => (parseInt(a.number ?? '0') || 0) - (parseInt(b.number ?? '0') || 0))
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [sector])

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{sector.name}</p>
      <div className="space-y-1.5 overflow-x-auto">
        {rows.map(([label, seats]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{label}</span>
            <div className="flex flex-wrap gap-1.5">
              {seats.map((seat) => {
                const state = seat.blocked ? 'blocked' : occupied.has(seat.id) ? 'occupied' : selected.has(seat.id) ? 'selected' : 'free'
                const disabled = state === 'blocked' || state === 'occupied'
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={state === 'selected'}
                    aria-label={`Assento ${label}${seat.number ?? ''} ${labelForState(state)}`}
                    onClick={() => onToggle(seat.id)}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md text-[11px] font-medium transition-colors',
                      state === 'free' && 'bg-secondary hover:bg-primary/20',
                      state === 'selected' && 'bg-primary text-primary-foreground',
                      state === 'occupied' && 'cursor-not-allowed bg-muted text-muted-foreground/40',
                      state === 'blocked' && 'cursor-not-allowed bg-transparent text-muted-foreground/30 line-through',
                    )}
                  >
                    {seat.number}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TextualPicker({ sectors, occupied, selected, onToggle }: { sectors: PublicSector[] } & Omit<Props, 'sectors'>) {
  return (
    <details className="rounded-lg border border-border p-3 text-sm">
      <summary className="cursor-pointer font-medium">Selecionar assento por código</summary>
      <div className="mt-3 space-y-3">
        {sectors.map((sec) => (
          <div key={sec.id}>
            <p className="mb-1 text-xs text-muted-foreground">{sec.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {(sec.seats ?? [])
                .filter((s) => !s.blocked && !occupied.has(s.id))
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onToggle(s.id)}
                    aria-pressed={selected.has(s.id)}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs',
                      selected.has(s.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                    )}
                  >
                    {(s.row_label ?? '') + (s.number ?? '')}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <Chip className="bg-secondary" label="Livre" />
      <Chip className="bg-primary" label="Selecionado" />
      <Chip className="bg-muted" label="Ocupado" />
    </div>
  )
}

function Chip({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-3 rounded', className)} /> {label}
    </span>
  )
}

function labelForState(s: string) {
  return s === 'free' ? 'livre' : s === 'selected' ? 'selecionado' : s === 'occupied' ? 'ocupado' : 'bloqueado'
}
