// Service worker do Timbre: shell offline da área de ingressos (§3.5). Estratégia
// network-first com cache de fallback — o que já abriu abre de novo sem rede. Os dados do
// ingresso (token/QR) ficam no localStorage do app, então renderizam offline.
const CACHE = 'timbre-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Não intercepta as chamadas de API (dados frescos ou 401 limpo).
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/ingressos'))),
  )
})
