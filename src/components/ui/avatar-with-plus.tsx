"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { PlusBadge } from "./plus-badge"

interface AvatarWithPlusProps extends React.ComponentProps<typeof AvatarPrimitive.Root> {
  isPlus?: boolean;
  badgeSize?: "sm" | "md" | "lg";
}

function AvatarWithPlus({
  className,
  isPlus = false,
  badgeSize = "sm",
  ...props
}: AvatarWithPlusProps) {
  return (
    <div className="relative">
      <AvatarPrimitive.Root
        data-slot="avatar"
        className={cn(
          "relative flex size-8 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
      {isPlus && <PlusBadge size={badgeSize} />}
    </div>
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { AvatarWithPlus, AvatarImage, AvatarFallback }
