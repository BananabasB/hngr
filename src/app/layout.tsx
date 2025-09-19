import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";


const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["300", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "hngr",
  description: "make your own survival games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmMono.className} antialiased`}
      >
        <div className="h-screen w-screen flex bg-base">
      <SidebarProvider><AppSidebar></AppSidebar>
        <main className="flex-1 h-full overflow-y-auto">
  {children}
</main>
</SidebarProvider>
    </div>
      </body>
    </html>
  );
}
