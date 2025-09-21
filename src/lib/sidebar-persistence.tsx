"use client"

import { useEffect } from "react"
import { useSidebar } from "@/components/ui/sidebar"

export function SidebarPersistence() {
  const { open } = useSidebar()

  useEffect(() => {
    document.cookie = `sidebar-open=${open ? "true" : "false"}; max-age=${30 * 24 * 60 * 60}`
  }, [open])

  return null
}
