"use client"

import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"

interface PlusBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PlusBadge({ className, size = "sm" }: PlusBadgeProps) {
  const sizeClasses = {
    sm: "h-4 w-4 text-xs",
    md: "h-5 w-5 text-sm", 
    lg: "h-6 w-6 text-base"
  };

  return (
    <div
      className={cn(
        "absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center border-2 border-background",
        sizeClasses[size],
        className
      )}
    >
      <Plus className="h-2/3 w-2/3" strokeWidth={3} />
    </div>
  );
}
