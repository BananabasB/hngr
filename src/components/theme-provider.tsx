"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const isInitialMount = React.useRef(true)

  React.useEffect(() => {
    // only run once on mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      const palette = sessionStorage.getItem("palette") || 
                      localStorage.getItem("palette") || 
                      "default"
      document.documentElement.dataset.palette = palette
    }

    // listen for changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "palette" && e.newValue) {
        document.documentElement.dataset.palette = e.newValue
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  return (
    <NextThemesProvider {...props} attribute="class">
      {children}
    </NextThemesProvider>
  )
}