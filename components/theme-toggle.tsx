'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = theme !== 'light'
  return (
    <button
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-secondary"
    >
      {mounted && (isDark ? <Sun className="size-5" /> : <Moon className="size-5" />)}
    </button>
  )
}
