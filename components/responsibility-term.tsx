'use client'

/**
 * GANCHO do termo de responsabilidade do produtor — sem texto, de propósito.
 *
 * A meia-entrada deixou de ser travada em 40%: o produtor pode definir menos, e a
 * responsabilidade pelo cumprimento da Lei 12.933/2013 é dele. O que formaliza isso é um
 * termo no aceite do cadastro — e o texto de um termo desses depende de REVISÃO JURÍDICA,
 * não de redação nossa.
 *
 * Então o lugar existe e o conteúdo não. Enquanto `TERMO` estiver vazio, este componente não
 * renderiza nada e o cadastro segue igual; quando o texto chegar, ele aparece aqui, no aceite,
 * e é aqui que o `onChange` passa a valer como consentimento registrado.
 *
 * Escrever um texto provisório seria pior que não ter: um termo que ninguém revisou tem a
 * aparência de proteção sem ser proteção.
 */
const TERMO = ''

export function ResponsibilityTerm({ onChange }: { onChange?: (aceito: boolean) => void }) {
  if (!TERMO) return null
  return (
    <label className="flex items-start gap-2 text-xs text-muted-foreground">
      <input type="checkbox" className="mt-0.5" onChange={(e) => onChange?.(e.target.checked)} />
      <span>{TERMO}</span>
    </label>
  )
}
