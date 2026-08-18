import { NextResponse, type NextRequest } from 'next/server'

// Cabeçalhos de segurança (§4.1). CSP com NONCE para scripts (sem unsafe-inline no vetor
// de XSS — o Next lê o nonce do header e o aplica aos seus scripts). style-src mantém
// unsafe-inline (Tailwind v4 + next/font injetam estilos inline; risco baixo). connect-src
// 'self' porque o navegador só fala com as rotas-proxy do próprio Next.
//
// A CSP estrita só é aplicada em produção: em dev, o eval() do React/Next (HMR/DevTools) é
// bloqueado pelo strict-dynamic, deixando um badge vermelho ruidoso nas telas (§4.1).
export function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers)
  const isProd = process.env.NODE_ENV !== 'development'

  let nonce = ''
  let csp = ''
  if (isProd) {
    nonce = Buffer.from(crypto.randomUUID()).toString('base64')
    csp = [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: https:`,
      `font-src 'self' data:`,
      `connect-src 'self'`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `object-src 'none'`,
    ].join('; ')
    requestHeaders.set('x-nonce', nonce)
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'no-referrer')
  if (isProd) res.headers.set('Content-Security-Policy', csp)
  return res
}

export const config = {
  // Todas as rotas menos assets estáticos do Next e o favicon.
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico|sw.js|icon-.*).*)' }],
}
