'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, LogOut } from 'lucide-react'
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
        <button onClick={out} className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <LogOut className="size-4" /> Sair
        </button>
      </div>
    </header>
  )
}
