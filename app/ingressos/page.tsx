'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, LogOut, Ticket, WifiOff, RefreshCw } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { TicketQR } from '@/components/ticket-qr'
import { TicketActions } from '@/components/ticket-actions'
import { fetchMyTickets, logout } from '@/lib/client'
import { formatDateTime } from '@/lib/format'
import type { MyTicket } from '@/lib/types'

const CACHE_KEY = 'timbre_tickets'

// Meus ingressos (PWA): cache local do QR para abrir sem rede (§3.5). Uma vez carregado,
// reabre offline lendo do localStorage; o service worker serve o shell.
export default function IngressosPage() {
  const [tickets, setTickets] = useState<MyTicket[] | null>(null)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [offline, setOffline] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  function reload() {
    fetchMyTickets()
      .then(({ authed, tickets }) => {
        setAuthed(authed)
        if (authed) {
          setTickets(tickets)
          setOffline(false)
          setLastSync(new Date())
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(tickets))
          } catch {}
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    let alive = true
    fetchMyTickets()
      .then(({ authed, tickets }) => {
        if (!alive) return
        setAuthed(authed)
        if (authed) {
          setTickets(tickets)
          setLastSync(new Date())
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(tickets))
          } catch {}
        }
      })
      .catch(() => {
        // Offline: cai para o cache local.
        try {
          const cached = localStorage.getItem(CACHE_KEY)
          if (cached) {
            setTickets(JSON.parse(cached))
            setAuthed(true)
            setOffline(true)
          } else setAuthed(false)
        } catch {
          setAuthed(false)
        }
      })
    return () => {
      alive = false
    }
  }, [])

  async function doLogout() {
    await logout()
    try {
      localStorage.removeItem(CACHE_KEY) // QR limpo no logout (§4.1)
    } catch {}
    setAuthed(false)
    setTickets(null)
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 pb-20 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Meus ingressos</h1>
          <div className="flex items-center gap-2">
            {authed && (
              <button onClick={reload} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <RefreshCw className="size-4" /> Atualizar
              </button>
            )}
            {authed && (
              <button onClick={doLogout} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <LogOut className="size-4" /> Sair
              </button>
            )}
          </div>
        </div>

        {authed && lastSync && !offline && (
          <p className="mt-1 text-xs text-muted-foreground">
            Sincronizado às {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {offline && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-secondary p-2 text-sm text-muted-foreground">
            <WifiOff className="size-4" /> Sem conexão — mostrando seus ingressos salvos.
          </p>
        )}

        {authed === null && <p className="mt-8 text-center text-muted-foreground">Carregando…</p>}

        {authed === false && (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center">
            <Ticket className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-3 font-display font-semibold">Seus ingressos ficam aqui</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Comprou como convidado? Entre com o e-mail usado na compra e o ingresso aparece aqui.
            </p>
            <div className="mt-5 space-y-2">
              <Link href="/conta" className="block">
                <Button className="w-full">Entrar com e-mail</Button>
              </Link>
              <Link href="/eventos" className="block">
                <Button variant="outline" className="w-full">Ver eventos</Button>
              </Link>
            </div>
          </div>
        )}

        {authed && tickets && tickets.length === 0 && (
          <div className="mt-10 text-center text-muted-foreground">
            <p>Você ainda não tem ingressos.</p>
            <Link href="/eventos" className="mt-4 inline-block">
              <Button variant="outline">Ver eventos</Button>
            </Link>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {tickets?.map((t) => (
            <article key={t.ticket_id} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">{t.event_title}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="size-4" /> {formatDateTime(t.event_starts_at)}
                {t.venue_city ? ` · ${t.venue_city}` : ''}
              </p>
              {t.seat_label && <p className="mt-1 text-sm">Assento {t.seat_label}</p>}
              {t.status !== 'active' ? (
                <p className="mt-3 rounded-lg bg-secondary p-2 text-center text-sm text-muted-foreground">
                  Ingresso {t.status === 'refunded' ? 'estornado' : t.status}
                </p>
              ) : t.token ? (
                <TicketQR token={t.token} />
              ) : null}
              <Link href={`/t/${t.ticket_id}`} className="mt-3 block text-center text-sm text-primary">
                Prova de propriedade / compartilhar
              </Link>
              {t.status === 'active' && <TicketActions ticketId={t.ticket_id} onChanged={reload} />}
            </article>
          ))}
        </div>
      </main>
    </>
  )
}
