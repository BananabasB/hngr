import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

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
        className={`${ibmMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
