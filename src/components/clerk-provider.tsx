// src/components/clerk-provider.tsx
"use client";

import { ClerkProvider as ClerkNextJSProvider } from "@clerk/nextjs";

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkNextJSProvider
    >
      {children}
    </ClerkNextJSProvider>
  );
}
