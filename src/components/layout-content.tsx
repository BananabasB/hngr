"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarPersistence } from "@/lib/sidebar-persistence";
import { OnboardingOverlay } from "@/components/onboarding-overlay";
import { usePathname } from "next/navigation";

interface LayoutContentProps {
  children: React.ReactNode;
  defaultOpen: boolean;
}

export function LayoutContent({ children, defaultOpen }: LayoutContentProps) {
  const pathname = usePathname();
  
  // Routes that should NOT have a sidebar or app shell
  const isPublicStandalone = 
    pathname.startsWith("/waitlist") || 
    pathname.startsWith("/public-nominate") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/sso-callback") ||
    pathname.startsWith("/sign-up");

  if (isPublicStandalone) {
    return (
      <main className="min-h-screen w-full bg-background flex flex-col">
        {children}
      </main>
    );
  }

  return (
    <div className="relative h-screen w-screen flex bg-background">
      <SidebarProvider defaultOpen={defaultOpen}>
        <SidebarPersistence />
        <div className="absolute top-0 left-0 w-full h-10 p-2 bg-gradient-to-t from-transparent to-base z-50 md:hidden">
          <SidebarTrigger/>
        </div>
        <AppSidebar />
        <main className="flex-1 bg-background h-screen overflow-y-auto">
          {children}
        </main>
        <OnboardingOverlay />
      </SidebarProvider>
    </div>
  );
}
