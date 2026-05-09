// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@/components/clerk-provider";
import { SupabaseProvider } from "@/components/supabase-provider-final";
import { StateProvider } from "@/lib/state-context-refactored";
import { OnboardingProvider } from "@/lib/onboarding-context";
import { LayoutContent } from "@/components/layout-content";
import { IBM_Plex_Mono } from "next/font/google";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  style: "normal",
  subsets: ["latin"],
  variable: "--font-ibm-mono",
});

export const metadata: Metadata = {
  title: "hngr",
  description: "simulate survival games with your friends",
  icons: {
    icon: "/favicon.svg",
  },
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
      <body className={`${ibmPlexMono.variable} font-mono antialiased`}>
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
