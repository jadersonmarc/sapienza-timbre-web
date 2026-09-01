'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Pencil, Search } from 'lucide-react'

export type Venue = {
  venue_name: string
  address: string
  city: string
  place_id?: string
  lat?: number | null
  lng?: number | null
}

/**
 * Local do evento: por busca, ou na mão.
 *
 * Os dois caminhos são completos. Local sem cadastro no catálogo de mapas — o galpão, a casa
 * de shows que abriu semana passada — precisa funcionar igual, e por isso o "digitar na mão"
 * é um botão à vista, não um remendo escondido para quando a busca falha.
 *
 * O autocompletar é cobrado por SESSÃO: o token nasce quando o campo ganha foco e vive até a
 * escolha, então uma busca inteira custa uma. O debounce existe pelo mesmo motivo — e para
 * não disparar uma chamada por tecla.
 */
export function VenueField({ value, onChange }: { value: Venue; onChange: (v: Venue) => void }) {
  const [q, setQ] = useState(value.venue_name ?? '')
  const [sugestoes, setSugestoes] = useState<{ place_id: string; main: string; secondary: string }[]>([])
  const [manual, setManual] = useState(!!value.address && !value.place_id)
  const [indisponivel, setIndisponivel] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const sessao = useRef('')

  // Token de sessão do autocompletar: nasce no foco, morre na escolha. É ele que junta as
  // digitações numa cobrança só.
  function abrirSessao() {
    if (!sessao.current) sessao.current = crypto.randomUUID()
  }

  useEffect(() => {
    if (manual || q.trim().length < 3 || q === value.venue_name) {
      setSugestoes([])
      return
    }
    const t = setTimeout(async () => {
      abrirSessao()
      setBuscando(true)
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: q, sessionToken: sessao.current }),
      })
      setBuscando(false)
      const data = await res.json().catch(() => ({}))
      // Sem chave configurada, a busca simplesmente não existe: o campo vira manual e a
      // tela não quebra.
      if (data.configured === false) {
        setManual(true)
        return
      }
      setIndisponivel(!!data.unavailable)
      setSugestoes(data.suggestions ?? [])
    }, 350)
    return () => clearTimeout(t)
  }, [q, manual, value.venue_name])

  async function escolher(placeId: string) {
    const res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId, sessionToken: sessao.current }),
    })
    sessao.current = '' // a sessão de cobrança termina aqui
    const data = await res.json().catch(() => ({}))
    if (!data.place) return
    onChange(data.place)
    setQ(data.place.venue_name)
    setSugestoes([])
  }

  if (manual) {
    return (
      <div className="space-y-3">
        <Campo label="Nome do local" value={value.venue_name}
          onChange={(v) => onChange({ ...value, venue_name: v })}
          placeholder="Ex.: Circo Voador" />
        <Campo label="Endereço" value={value.address}
          onChange={(v) => onChange({ ...value, address: v })}
          placeholder="Rua, número, bairro" />
        <Campo label="Cidade" value={value.city}
          onChange={(v) => onChange({ ...value, city: v })} />
        <button type="button" onClick={() => setManual(false)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground underline">
          <Search className="size-3.5" /> Voltar a buscar pelo nome
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-sm text-muted-foreground">Local</span>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onFocus={abrirSessao}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busque pelo nome do lugar"
            className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm"
          />
        </div>
      </label>

      {sugestoes.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <ul>
            {sugestoes.map((s) => (
              <li key={s.place_id}>
                <button type="button" onClick={() => escolher(s.place_id)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary">
                  <span className="font-medium">{s.main}</span>
                  <span className="block text-xs text-muted-foreground">{s.secondary}</span>
                </button>
              </li>
            ))}
          </ul>
          {/* Atribuição exigida por quem fornece os resultados. Fica ONDE eles aparecem. */}
          <p className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
            Resultados fornecidos pelo Google
          </p>
        </div>
      )}

      {buscando && <p className="text-xs text-muted-foreground">Buscando…</p>}
      {indisponivel && (
        <p className="text-xs text-muted-foreground">
          A busca está indisponível agora — você pode digitar o endereço.
        </p>
      )}

      {value.address && (
        <p className="rounded-lg bg-secondary p-2 text-xs text-muted-foreground">
          {value.address}
          {value.city && ` · ${value.city}`}
        </p>
      )}

      <button type="button" onClick={() => setManual(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground underline">
        <Pencil className="size-3.5" /> Não encontrou? Digitar o endereço
      </button>
    </div>
  )
}

function Campo({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted-foreground">{label}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm" />
    </label>
  )
}
