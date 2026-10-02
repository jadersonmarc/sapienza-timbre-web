/**
 * Revenda (mercado secundário) DESLIGADA no lançamento.
 *
 * O dinheiro de quem revende entraria na conta da plataforma sem repasse ao vendedor
 * modelado. O back recusa anunciar e comprar anúncio (403) e não sobe em produção com
 * TIMBRE_RESALE_ENABLED=true. Religar os dois juntos quando o repasse ao vendedor existir.
 * Transferência gratuita de titular não depende disto.
 */
export const RESALE_ENABLED = false
