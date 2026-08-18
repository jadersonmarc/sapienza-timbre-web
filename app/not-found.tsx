import Link from 'next/link'
import { Ticket } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'

// 404 customizado (resiliência percebida): em vez do genérico do Next, a marca + caminhos.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 pb-20 pt-24 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
          <Ticket className="size-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O link pode estar quebrado ou esta página foi movida.
        </p>
        <div className="mt-6 flex gap-2">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Início
          </Link>
          <Link
            href="/eventos"
            className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm hover:bg-secondary"
          >
            Ver eventos
          </Link>
        </div>
      </main>
    </>
  )
}
