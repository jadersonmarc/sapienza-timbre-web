import { cookies } from 'next/headers'
import { PRODUCER_COOKIE } from '@/lib/producer-session'

export async function POST() {
  const c = await cookies()
  c.delete(PRODUCER_COOKIE)
  return Response.json({ ok: true })
}
