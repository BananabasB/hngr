// src/app/layout.tsx
import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@/components/clerk-provider";
import { SupabaseProvider } from "@/components/supabase-provider-final";
import { StateProvider } from "@/lib/state-context-refactored";
import { OnboardingProvider } from "@/lib/onboarding-context";
import { LayoutContent } from "@/components/layout-content";

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "hngr",
  description: "simulate survival games with your friends",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar-open")?.value === "true";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmMono.className} ${ibmMono.variable} antialiased`}>
        <ClerkProvider>
          <SupabaseProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <StateProvider>
                <OnboardingProvider>
                  <LayoutContent defaultOpen={defaultOpen}>
                    {children}
                  </LayoutContent>
                </OnboardingProvider>
              </StateProvider>
            </ThemeProvider>
          </SupabaseProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}