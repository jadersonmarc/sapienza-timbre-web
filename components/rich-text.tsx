import type { ReactNode } from 'react'

/**
 * Renderiza o texto do produtor a partir de marcação simples.
 *
 * O texto chega do servidor como TEXTO — já sem HTML, limpo na escrita. Aqui ele vira
 * elementos React de um conjunto FECHADO: parágrafo, quebra, lista, negrito, itálico e
 * link. Nada de `dangerouslySetInnerHTML`: o que o produtor escreve nunca é interpretado
 * como marcação nossa, e um caractere estranho no meio do texto é só um caractere.
 *
 * O que a marcação cobre foi escolhido pelo que uma descrição de evento realmente precisa —
 * "Abertura da casa às 19:00", uma lista de horários, uma linha em destaque, o link do
 * regulamento. Cabeçalho, imagem e tabela ficam de fora: quebram o ritmo da página de venda
 * e, no caso da imagem, deixariam um terceiro rastrear quem abriu o evento.
 */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = parseBlocks(text)
  if (blocks.length === 0) return null
  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((b, i) =>
        b.kind === 'list' ? (
          <ul key={i} className="ml-5 list-disc space-y-1">
            {b.items.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {inline(b.text)}
          </p>
        ),
      )}
    </div>
  )
}

type Block = { kind: 'p'; text: string } | { kind: 'list'; items: string[] }

/**
 * Divide em parágrafos e listas. Linha em branco separa parágrafo; linha começando com "-"
 * ou "*" entra numa lista — que é como as pessoas já escrevem sem pensar em marcação.
 */
function parseBlocks(text: string): Block[] {
  const out: Block[] = []
  let paragraph: string[] = []
  let list: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) out.push({ kind: 'p', text: paragraph.join('\n') })
    paragraph = []
  }
  const flushList = () => {
    if (list.length) out.push({ kind: 'list', items: list })
    list = []
  }

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const item = /^\s*[-*]\s+(.*)$/.exec(line)
    if (item) {
      flushParagraph()
      list.push(item[1])
      continue
    }
    flushList()
    if (line.trim() === '') flushParagraph()
    else paragraph.push(line)
  }
  flushParagraph()
  flushList()
  return out
}

// Marcação de linha, na ordem em que é reconhecida. Link primeiro: o texto dele pode conter
// os outros marcadores, e reconhecê-los antes partiria o link ao meio.
const RULES: { re: RegExp; render: (m: RegExpExecArray, key: number) => ReactNode }[] = [
  {
    re: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/,
    render: (m, key) => (
      // rel: o destino é escolhido por terceiro. noopener corta o acesso à nossa janela e
      // nofollow evita emprestar reputação de busca para onde não controlamos.
      <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer nofollow"
         className="text-primary underline underline-offset-2">
        {m[1]}
      </a>
    ),
  },
  { re: /\*\*([^*]+)\*\*/, render: (m, key) => <strong key={key}>{m[1]}</strong> },
  { re: /(?<!\*)\*([^*]+)\*(?!\*)/, render: (m, key) => <em key={key}>{m[1]}</em> },
]

/** inline aplica a marcação de linha, recursivamente, sobre o texto restante. */
function inline(text: string, key = 0): ReactNode[] {
  for (const rule of RULES) {
    const m = rule.re.exec(text)
    if (!m) continue
    const before = text.slice(0, m.index)
    const after = text.slice(m.index + m[0].length)
    return [...inline(before, key + 1), rule.render(m, key), ...inline(after, key + 2)]
  }
  return text ? [text] : []
}

/**
 * plainText tira a marcação, para os lugares que precisam de texto puro: a meta description,
 * o JSON-LD e o card de compartilhamento. Sem isso, o resultado da busca mostraria os
 * asteriscos.
 */
export function plainText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}
