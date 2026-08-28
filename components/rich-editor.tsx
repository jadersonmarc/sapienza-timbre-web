'use client'

import { useRef, useState } from 'react'
import { Bold, Italic, List, Link2, Eye, Pencil } from 'lucide-react'
import { RichText } from '@/components/rich-text'

/**
 * Editor do texto do produtor.
 *
 * Os botões inserem MARCAÇÃO no texto, não HTML. O que sai daqui é texto puro que o servidor
 * guarda como texto e a página renderiza a partir de um conjunto fechado de elementos — o
 * produtor formata sem que a marcação dele vire marcação nossa.
 *
 * A pré-visualização usa o MESMO renderizador da página pública. Um editor que mostra uma
 * coisa e a página mostra outra é pior que não ter pré-visualização: o produtor ajusta o
 * texto contra uma referência falsa.
 */
export function RichEditor({
  value,
  onChange,
  rows = 10,
  maxLength = 5000,
  placeholder,
  id,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  maxLength?: number
  placeholder?: string
  id?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)

  /** wrap envolve a seleção com o marcador; sem seleção, deixa o cursor no meio dele. */
  function wrap(mark: string) {
    const el = ref.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    const selected = value.slice(a, b) || 'texto'
    const next = value.slice(0, a) + mark + selected + mark + value.slice(b)
    onChange(next.slice(0, maxLength))
    // Devolve o foco com a seleção sobre o conteúdo, para digitar por cima direto.
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + mark.length, a + mark.length + selected.length)
    })
  }

  /** prefixLines marca cada linha da seleção — é como uma lista nasce de texto já escrito. */
  function prefixLines(prefix: string) {
    const el = ref.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    const start = value.lastIndexOf('\n', a - 1) + 1
    const chunk = value.slice(start, b) || 'item'
    const marked = chunk
      .split('\n')
      .map((l) => (l.startsWith(prefix) ? l : prefix + l))
      .join('\n')
    onChange((value.slice(0, start) + marked + value.slice(b)).slice(0, maxLength))
    requestAnimationFrame(() => el.focus())
  }

  function insertLink() {
    const el = ref.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    const label = value.slice(a, b) || 'texto do link'
    const snippet = `[${label}](https://)`
    onChange((value.slice(0, a) + snippet + value.slice(b)).slice(0, maxLength))
    requestAnimationFrame(() => {
      el.focus()
      // Cursor logo após "https://", que é o que falta completar.
      const pos = a + snippet.length - 1
      el.setSelectionRange(pos, pos)
    })
  }

  const restam = maxLength - value.length

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1.5">
        <Tool onClick={() => wrap('**')} title="Negrito"><Bold className="size-4" /></Tool>
        <Tool onClick={() => wrap('*')} title="Itálico"><Italic className="size-4" /></Tool>
        <Tool onClick={() => prefixLines('- ')} title="Lista"><List className="size-4" /></Tool>
        <Tool onClick={insertLink} title="Link"><Link2 className="size-4" /></Tool>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="ml-auto flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
        >
          {preview ? <><Pencil className="size-3.5" /> Escrever</> : <><Eye className="size-3.5" /> Ver como fica</>}
        </button>
      </div>

      {preview ? (
        <div className="min-h-[8rem] p-3 text-sm">
          {value.trim() ? (
            <RichText text={value} />
          ) : (
            <p className="text-muted-foreground">Nada escrito ainda.</p>
          )}
        </div>
      ) : (
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-y bg-transparent p-3 text-sm outline-none"
        />
      )}

      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span>Use os botões ou escreva **negrito**, *itálico* e listas com “-”.</span>
        <span className={restam < 200 ? 'text-signal' : ''}>{restam} restantes</span>
      </div>
    </div>
  )
}

function Tool({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      {children}
    </button>
  )
}
