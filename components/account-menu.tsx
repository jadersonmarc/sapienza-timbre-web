'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserRound, Ticket, LogOut } from 'lucide-react'
import { fetchBuyerSession, logout, clearAnonToken } from '@/lib/client'

// O canto do header que diz se há alguém logado. Sem ele, a pessoa comprava, recebia o
// ingresso e não tinha como saber que existia uma conta — nem onde mexer nela.
export function AccountMenu() {
  const router = useRouter()
  const [me, setMe] = useState<{ authed: boolean; name?: string; email?: string } | null>(null)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchBuyerSession().then(setMe)
  }, [])

  // Fecha ao clicar fora: menu preso aberto atrapalha mais que ajuda no celular.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!me) return null

  if (!me.authed) {
    return (
      <Link href="/conta" className="rounded-lg px-3 py-2 hover:bg-secondary">
        Entrar
      </Link>
    )
  }

  const first = (me.name ?? me.email ?? '?').trim().split(/\s+/)[0]
  const initial = first.charAt(0).toUpperCase()

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {initial}
        </span>
        <span className="hidden max-w-24 truncate sm:inline">{first}</span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <Link href="/minha-conta" className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary" onClick={() => setOpen(false)}>
            <UserRound className="size-4" /> Minha conta
          </Link>
          <Link href="/ingressos" className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary" onClick={() => setOpen(false)}>
            <Ticket className="size-4" /> Meus ingressos
          </Link>
          <button
            onClick={async () => {
              await logout()
              clearAnonToken()
              setOpen(false)
              router.push('/')
              router.refresh()
            }}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm hover:bg-secondary"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      )}
    </div>
  )
}
