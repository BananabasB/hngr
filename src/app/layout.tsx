import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["300", "500", "600", "700"]
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
  const defaultOpen = cookieStore.get("sidebar-open")?.value === "true" ? true : false;
  return (
    <html lang="en">
      <body
        className={`${ibmMono.className} antialiased`}
      >
        <div className="h-screen w-screen flex bg-base">
      <SidebarProvider defaultOpen={defaultOpen}><AppSidebar></AppSidebar>
        <main className="flex-1 h-full overflow-y-auto">
  {children}
</main>
</SidebarProvider>
    </div>
      </body>
    </html>
  );
}
