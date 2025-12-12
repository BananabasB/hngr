import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@/components/clerk-provider";
import { StateProvider } from "@/lib/state-context";
import { LayoutContent } from "@/components/layout-content";

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: [ "500", "700"],
});

export const metadata: Metadata = {
  title: "hngr",
  description: "connect and share with your community",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen =
    cookieStore.get("sidebar-open")?.value === "true" ? true : false;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmMono.className} ${ibmMono.variable} antialiased`}>
        <ClerkProvider>
        <ThemeProvider
        attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <StateProvider>
            <LayoutContent defaultOpen={defaultOpen}>
              {children}
            </LayoutContent>
          </StateProvider>
        </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
