import { cookies } from 'next/headers'
import { ADMIN_COOKIE } from '@/lib/admin-session'

export async function POST() {
  const c = await cookies()
  c.delete(ADMIN_COOKIE)
  return Response.json({ ok: true })
}
