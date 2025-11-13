"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  React.useEffect(() => {
    const palette = localStorage.getItem("palette") || "default"
    document.documentElement.dataset.palette = palette
  }, [])

  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  )
}