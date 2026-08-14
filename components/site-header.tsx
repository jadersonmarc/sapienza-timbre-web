import Link from 'next/link'
import { Ticket } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

// Chrome mínimo: a marca recua, a imagem do evento manda (§6). Header enxuto e fixo.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <Ticket className="size-5 text-primary" />
          Timbre
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/eventos" className="rounded-lg px-3 py-2 hover:bg-secondary">
            Eventos
          </Link>
          <Link href="/ingressos" className="rounded-lg px-3 py-2 hover:bg-secondary">
            Meus ingressos
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
