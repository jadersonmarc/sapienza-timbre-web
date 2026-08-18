'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

// Escuro é o padrão no público (decisão travada) e vale em todo o site. `attribute="class"`
// casa com o `.dark` do globals.css.
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange {...props}>
      {children}
    </NextThemesProvider>
  )
}
