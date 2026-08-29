'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Plus, ShieldCheck } from 'lucide-react'
import { ProducerNav } from '@/components/producer-nav'
import { RefundPolicyForm } from '@/components/refund-policy-form'
import { Button } from '@/components/ui/button'
import { pget, ppost } from '@/lib/producer'

const PERMS = [
  { key: 'checkin', label: 'Portaria', hint: 'valida ingresso e faz check-in no dia' },
  { key: 'financeiro', label: 'Financeiro', hint: 'vê valores, repasses e devoluções' },
  { key: 'relatorios', label: 'Relatórios', hint: 'vê vendas e público' },
  { key: 'atendimento', label: 'Atendimento', hint: 'busca compras e fala com o comprador' },
]

/**
 * Configurações da casa: o que vale para todos os eventos.
 *
 * Junta três coisas que o produtor não tinha por onde mexer — a política de devolução
 * padrão, quem trabalha com ele e o acesso da portaria. As duas primeiras já vinculavam o
 * produtor mesmo sem tela: a política porque o sistema aplica o default, e a equipe porque
 * sem colaborador ninguém além do dono consegue operar o dia do evento.
 */
export default function ConfiguracoesPage() {
  const router = useRouter()
  return (
    <>
      <ProducerNav />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8">
        <h1 className="font-display text-2xl font-bold">Configurações da casa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vale para todos os seus eventos. Cada evento pode ter a própria política.
        </p>

        <Section title="Política de devolução (padrão)"
          hint="O que o comprador lê na página antes de comprar, e o que o sistema aplica sozinho.">
          <RefundPolicyForm />
        </Section>

        <Collaborators onUnauthorized={() => router.replace('/painel/entrar')} />
        <GateAccess />
      </main>
    </>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border border-border p-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

type Collaborator = { id: string; email: string; is_owner: boolean; permissions: string[] }

/** Equipe: quem mais entra no painel, e com qual alcance. */
function Collaborators({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [list, setList] = useState<Collaborator[]>([])
  const [f, setF] = useState({ email: '', password: '', perms: [] as string[] })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(() => {
    pget('collaborators').then((r) => {
      if (r.status === 401) return onUnauthorized()
      if (r.ok) setList(r.data.collaborators ?? [])
    })
  }, [onUnauthorized])
  useEffect(load, [load])

  function toggle(k: string) {
    setF((p) => ({ ...p, perms: p.perms.includes(k) ? p.perms.filter((x) => x !== k) : [...p.perms, k] }))
  }

  async function add() {
    setMsg('')
    if (!f.email.trim()) return setMsg('Informe o e-mail.')
    if (f.password.length < 8) return setMsg('A senha precisa de pelo menos 8 caracteres.')
    setBusy(true)
    const r = await ppost('collaborators', {
      email: f.email.trim(), password: f.password, permissions: f.perms,
    })
    setBusy(false)
    if (!r.ok) return setMsg(r.data?.error ?? 'Não foi possível convidar.')
    setF({ email: '', password: '', perms: [] })
    setMsg('Colaborador criado. Passe a senha para ele e peça que troque.')
    load()
  }

  return (
    <Section title="Equipe"
      hint="Quem mais entra no painel. O dono tem tudo; os demais só o que você marcar.">
      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm">
            <span>{c.email}</span>
            <span className="text-muted-foreground">
              {c.is_owner
                ? 'dono (acesso total)'
                : c.permissions.length
                  ? c.permissions.map((p) => PERMS.find((x) => x.key === p)?.label ?? p).join(', ')
                  : 'sem permissões'}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <input placeholder="e-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input placeholder="senha inicial" type="text" value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap gap-3">
          {PERMS.map((p) => (
            <label key={p.key} className="flex items-start gap-1.5 text-sm" title={p.hint}>
              <input type="checkbox" className="mt-1" checked={f.perms.includes(p.key)}
                onChange={() => toggle(p.key)} />
              <span>{p.label}<span className="block text-xs text-muted-foreground">{p.hint}</span></span>
            </label>
          ))}
        </div>
        <Button size="sm" onClick={add} disabled={busy}><Plus className="size-4" /> Convidar</Button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </div>
    </Section>
  )
}

/**
 * Acesso da portaria.
 *
 * A portaria valida o ingresso OFFLINE, com a chave pública embarcada — por isso ela
 * funciona sem internet na porta do evento. Mostrar a chave aqui é o que permite conferir
 * que o aparelho está com a certa quando um ingresso legítimo é recusado.
 */
function GateAccess() {
  const [key, setKey] = useState('')
  useEffect(() => {
    pget('gate/config').then((r) => r.ok && setKey(r.data.public_key ?? ''))
  }, [])

  return (
    <Section title="Portaria"
      hint="No dia do evento, quem faz o check-in abre esta página no celular e entra com a conta dele.">
      <div className="space-y-3 text-sm">
        <p className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          Endereço: <code className="rounded bg-secondary px-1.5 py-0.5">/gate</code>
        </p>
        <p className="text-muted-foreground">
          A conta precisa da permissão <strong>Portaria</strong> — crie em Equipe, acima. A
          validação funciona <strong>sem internet</strong>: o aparelho confere a assinatura do
          ingresso sozinho e sincroniza as entradas quando a rede voltar.
        </p>
        {key && (
          <div>
            <p className="flex items-center gap-2 text-muted-foreground">
              <KeyRound className="size-4" /> Chave pública que o aparelho embarca
            </p>
            <code className="mt-1 block break-all rounded-lg bg-secondary p-2 text-xs">{key}</code>
            <p className="mt-1 text-xs text-muted-foreground">
              Serve para conferir, se um ingresso válido for recusado, que o aparelho está com
              a chave certa.
            </p>
          </div>
        )}
        <Devices />
      </div>
    </Section>
  )
}

type Device = {
  device_id: string
  key_fingerprint: string
  gate: string
  checkins_synced: number
  last_sync_at: string
  key_current: boolean
}

/**
 * Aparelhos da portaria: quando cada um falou com o servidor e com qual chave.
 *
 * O aparelho que ficou com a chave antiga recusa ingresso legítimo — e recusa com a MESMA
 * cara de quem recusa um falso. Na fila da porta ninguém distingue as duas coisas, então o
 * lugar de descobrir isso é aqui, antes.
 *
 * Um aparelho só aparece depois de sincronizar pelo menos uma vez. A ausência de um que
 * deveria estar aqui também é resposta: ele nunca abriu a portaria com essa conta.
 */
function Devices() {
  const [list, setList] = useState<Device[]>([])
  useEffect(() => {
    pget('gate/devices').then((r) => r.ok && setList(r.data.devices ?? []))
  }, [])
  if (!list.length) return null

  const atrasados = list.filter((d) => !d.key_current)
  return (
    <div className="mt-4">
      <p className="text-sm font-medium">Aparelhos que já sincronizaram</p>
      {atrasados.length > 0 && (
        <p className="mt-1 rounded-lg bg-signal/10 p-2 text-xs text-signal">
          {atrasados.length} aparelho(s) não estão com a chave em uso. Abra a portaria neles
          com internet — a chave se atualiza sozinha ao entrar.
        </p>
      )}
      <ul className="mt-2 space-y-1">
        {list.map((d) => (
          <li key={d.device_id}
            className={`flex flex-wrap items-baseline justify-between gap-2 rounded-lg border p-2 text-xs ${
              d.key_current ? 'border-border' : 'border-signal/40 bg-signal/5'
            }`}>
            <span className="font-mono">{d.device_id.slice(0, 12)}{d.gate && ` · ${d.gate}`}</span>
            <span className="text-muted-foreground">
              {d.checkins_synced} check-in(s) · última sincronização{' '}
              {new Date(d.last_sync_at).toLocaleString('pt-BR')}
              {!d.key_current && (
                <strong className="ml-2 text-signal">
                  {d.key_fingerprint ? 'chave desatualizada' : 'chave não informada'}
                </strong>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
