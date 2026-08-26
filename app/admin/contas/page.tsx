'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, RefreshCw, XCircle } from 'lucide-react'
import { AdminNav } from '@/components/admin-nav'
import { Button } from '@/components/ui/button'
import { aget, apost } from '@/lib/admin'
import { formatDate } from '@/lib/format'

type Conta = {
  producer_id: string
  producer_name: string
  account_status: string
  wallet_id?: string
  person_type?: string
  onboarding_url?: string
  status_reason?: string
  can_sell: boolean
  commercial_info_expires_at?: string
  commercial_info_due: boolean
}

const ESTADO: Record<string, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  sem_conta: { label: 'Sem conta', tone: 'text-muted-foreground', icon: AlertTriangle },
  criada_aguardando_docs: { label: 'Aguardando documentos', tone: 'text-signal', icon: Clock },
  em_analise: { label: 'Em análise', tone: 'text-signal', icon: Clock },
  aprovada: { label: 'Aprovada', tone: 'text-primary', icon: CheckCircle2 },
  reprovada: { label: 'Reprovada', tone: 'text-destructive', icon: XCircle },
}

// Contas de recebimento dos produtores. Responde "por que fulano não consegue vender?" — o
// estado da análise, o link de documentação pendente e a confirmação anual num lugar só.
//
// O teto do período de avaliação regulatória aparece aqui porque é limite da PLATAFORMA,
// não de um produtor: estourado, ninguém mais abre conta.
export default function ContasPage() {
  const router = useRouter()
  const [contas, setContas] = useState<Conta[] | null>(null)
  const [resumo, setResumo] = useState<Record<string, number>>({})
  const [limite, setLimite] = useState<{ teto: number; alerta_em: number; contas_criadas: number } | null>(null)
  const [busy, setBusy] = useState('')

  const load = useCallback(() => {
    aget('subaccounts').then((r) => {
      if (r.status === 401) return router.replace('/admin/entrar')
      setContas(r.data.producers ?? [])
      setResumo(r.data.resumo ?? {})
      setLimite(r.data.limite_avaliacao ?? null)
    })
  }, [router])
  useEffect(load, [load])

  async function sincronizar(id: string) {
    setBusy(id)
    const r = await apost(`producers/${id}/subaccount/sync-documents`)
    setBusy('')
    if (!r.ok) window.alert(r.data?.error ?? 'Não foi possível buscar as pendências.')
    load()
  }

  const perto = limite && limite.contas_criadas >= limite.alerta_em

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Contas de recebimento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          É para a conta do produtor que vai o valor de face de cada venda, dividido na própria
          cobrança. Sem conta aprovada, o evento não abre venda.
        </p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span>
            Aprovadas: <strong>{resumo.aprovadas ?? 0}</strong>
          </span>
          <span className="text-signal">
            Aguardando: <strong>{resumo.aguardando ?? 0}</strong>
          </span>
          <span className="text-muted-foreground">
            Sem conta: <strong>{resumo.sem_conta ?? 0}</strong>
          </span>
        </div>

        {perto && (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <strong>{limite!.contas_criadas} de {limite!.teto}</strong> contas do período de avaliação
            regulatória. No teto, a criação de novas contas é bloqueada — e a janela é de 60 dias a
            partir da primeira conta criada.
          </p>
        )}

        {contas === null && <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>}

        <ul className="mt-6 space-y-3">
          {contas?.map((c) => {
            const e = ESTADO[c.account_status] ?? ESTADO.sem_conta
            const Icon = e.icon
            return (
              <li key={c.producer_id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{c.producer_name}</p>
                  <span className={`flex items-center gap-1.5 text-sm ${e.tone}`}>
                    <Icon className="size-4" /> {e.label}
                  </span>
                </div>

                {c.status_reason && (
                  <p className="mt-1 text-xs text-muted-foreground">{c.status_reason}</p>
                )}

                {c.commercial_info_expires_at && (
                  <p className={`mt-2 text-xs ${c.commercial_info_due ? 'text-signal' : 'text-muted-foreground'}`}>
                    Confirmação anual de dados comerciais: {formatDate(c.commercial_info_expires_at)}
                    {c.commercial_info_due && ' — sem confirmar, a conta perde o uso da API.'}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {c.onboarding_url && (
                    <a
                      href={c.onboarding_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="size-4" /> Link de documentação
                    </a>
                  )}
                  {c.account_status !== 'sem_conta' && (
                    <Button size="sm" variant="outline" disabled={busy === c.producer_id} onClick={() => sincronizar(c.producer_id)}>
                      <RefreshCw className="size-3.5" />
                      {busy === c.producer_id ? 'Buscando…' : 'Atualizar pendências'}
                    </Button>
                  )}
                  {c.wallet_id && (
                    <span className="ml-auto font-mono text-xs text-muted-foreground">{c.wallet_id}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </main>
    </>
  )
}
