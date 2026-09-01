'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Banknote, LayoutDashboard, LogOut, RotateCcw, Settings } from 'lucide-react'
import { producerLogout } from '@/lib/producer'

export function ProducerNav() {
  const router = useRouter()
  async function out() {
    await producerLogout()
    router.push('/painel/entrar')
  }
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/painel" className="flex items-center gap-2 font-display font-bold">
          <LayoutDashboard className="size-5 text-primary" /> Timbre · Painel
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/painel/repasses"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Banknote className="size-4" /> Repasses
          </Link>
          <Link
            href="/painel/devolucoes"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-4" /> Devoluções
          </Link>
          <Link
            href="/painel/configuracoes"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Settings className="size-4" /> Configurações
          </Link>
          <button onClick={out} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <LogOut className="size-4" /> Sair
          </button>
        </nav>
      </div>
    </header>
  )
}
