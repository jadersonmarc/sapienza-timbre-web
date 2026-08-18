# sapienza-timbre-web

Camada pública do **Timbre** (bilheteria) — o site do comprador. App **Next.js 16** (App
Router, React 19, Tailwind v4, next-themes) que consome a API pública do backend Go
(`sapienza-timbre`). Repo separado; deploy no **Coolify** (mesma VPS do backend).

## Onda 1 — o que existe
Home (3 portas), diretório com busca/filtros (SSR+ISR), página do evento (SSR+ISR, **OG
dinâmico**, JSON-LD, mapa de assentos), checkout (Pix com espera ativa, hold visível,
meia-entrada, cupom), conta por **e-mail + OTP** (sessão em cookie httpOnly), **meus
ingressos** (PWA com QR em cache offline), lista de espera e landing do produtor (cadastro
pendente de aprovação).

O navegador só fala com rotas-proxy same-origin (`app/api/*`), que encaminham ao Go e
gerenciam a sessão em cookie httpOnly (§4.1). CSP com nonce em `middleware.ts`.

## Rodar

```bash
pnpm install
TIMBRE_API=https://timbre-api.sapienzalabs.com.br pnpm dev   # http://localhost:3000
pnpm build && pnpm start
```

Variável: `TIMBRE_API` (URL do backend Go). Ver `.env.example`.

## Deploy (Coolify)
Build por `Dockerfile` (Next standalone, runtime Node). Defina `TIMBRE_API` no serviço e um
**limite de recurso** para o SSR não competir com o checkout do backend na abertura de lote
(§4.2). Ícones PWA (`public/icon-192.png`, `icon-512.png`) e favicon (`app/icon.svg`) presentes.

## Design
Tokens/tipografia extraídos de `../spa-sapienza` (mesma família). **Escuro é o padrão no
público**; a landing do produtor força claro. A imagem do evento domina; a marca recua ao
chrome.
