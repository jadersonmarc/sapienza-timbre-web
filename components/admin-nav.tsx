'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Shield, LogOut } from 'lucide-react'
import { adminLogout } from '@/lib/admin'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './theme-toggle'

const LINKS = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/produtores', label: 'Produtores' },
  { href: '/admin/artistas', label: 'Artistas' },
  { href: '/admin/eventos', label: 'Eventos' },
  { href: '/admin/moderation', label: 'Moderação' },
  { href: '/admin/contas', label: 'Contas' },
  { href: '/admin/repasses', label: 'Repasses' },
  { href: '/admin/relatorios', label: 'Relatórios' },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  async function out() {
    await adminLogout()
    router.push('/admin/entrar')
  }
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/admin" className="flex items-center gap-2 font-display font-bold">
          <Shield className="size-5 text-primary" /> Timbre · Admin
        </Link>
        <nav className="hidden gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm hover:bg-secondary',
                (l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href)) &&
                  'bg-secondary font-medium',
              )}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <button onClick={out} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <LogOut className="size-4" /> Sair
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
