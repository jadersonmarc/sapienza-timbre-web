import { NextResponse, type NextRequest } from 'next/server'

// Cabeçalhos de segurança (§4.1). Em dev não aplicamos CSP — o eval() do React/Next
// (HMR/DevTools) é bloqueado e gera um badge vermelho ruidoso.
//
// Em produção usamos `script-src 'self' 'unsafe-inline'` (SEM nonce/strict-dynamic): o nonce
// só é injetado em páginas renderizadas sob demanda; páginas estáticas (home, conta,
// ingressos, produtores — ISR/SSG) são pré-renderizadas sem nonce, e o `strict-dynamic`
// derrubaria os scripts delas, quebrando a hidratação (toggle/JS de tema não apareciam).
// style-src mantém unsafe-inline (Tailwind v4 + next/font injetam estilos inline).
export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'no-referrer')

  if (process.env.NODE_ENV === 'development') return res

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)
  return res
}

export const config = {
  // Todas as rotas menos assets estáticos do Next e o favicon.
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico|sw.js|icon-.*).*)' }],
}
