import { Fingerprint, ArrowLeftRight, BadgePercent } from 'lucide-react'

// Apresentação HONESTA dos diferenciais do ingresso: só o que está de fato
// implementado (assinatura Ed25519 verificável offline + transferência/revenda com
// procedência). Nenhuma alegação de "on-chain" — a emissão em rede ainda é Noop.

const ITEMS = [
  {
    icon: Fingerprint,
    title: 'Assinado e verificável',
    desc: 'Cada ingresso tem assinatura criptográfica (Ed25519) e é validado na entrada mesmo sem internet.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Transferência com rastro',
    desc: 'Repasse o ingresso para amigos com procedência rastreável — a posse fica clara do início ao fim.',
  },
  {
    icon: BadgePercent,
    title: 'Revenda justa',
    desc: 'Revenda com teto de preço e royalty automático para o produtor. Sem cambista, sem surpresa.',
  },
]

// TrustSection é o bloco "Por que Timbre?" da home.
export function TrustSection() {
  return (
    <section className="mt-12">
      <h2 className="font-display text-xl font-semibold">Seu ingresso é seu.</h2>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        No Timbre, o ingresso é um ativo digital com garantia de autenticidade — sem depender de ninguém na porta.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {ITEMS.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-3 font-display font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// TrustBadges é a linha de indicadores na página do evento (menor e mais discreta).
export function TrustBadges() {
  return (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map((f) => (
        <span
          key={f.title}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
        >
          <f.icon className="size-3.5 text-primary" />
          {f.title}
        </span>
      ))}
    </div>
  )
}
