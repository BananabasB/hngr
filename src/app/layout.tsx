import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { SidebarPersistence } from "@/lib/sidebar-persistence";
import { ThemeProvider } from "@/components/theme-provider";

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["300", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "hngr",
  description: "make your own survival games",
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
      <body className={`${ibmMono.className} antialiased`}>
        <ThemeProvider
        attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
        <div className="relative h-screen w-screen flex bg-base">
          <SidebarProvider defaultOpen={defaultOpen}>
            <SidebarPersistence />
            <div className="absolute top-0 left-0 w-full h-10 p-2 bg-gradient-to-t from-transparent to-base z-50 md:hidden">
              <SidebarTrigger/>
            </div>
            <AppSidebar />
            <main className="flex-1 h-screen overflow-y-auto">
              {children}

            </main>
          </SidebarProvider>
        </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
