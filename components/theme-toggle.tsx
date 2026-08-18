'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

// Toggle de tema sempre visível: os ícones alternam por CSS (`.dark` no <html>), sem esperar
// hidratação/mounted — assim o botão aparece na primeira carga em qualquer página (§4.1).
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'
  return (
    <button
      suppressHydrationWarning
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-secondary"
    >
      <Sun className="hidden size-5 dark:block" />
      <Moon className="size-5 dark:hidden" />
    </button>
  )
}
