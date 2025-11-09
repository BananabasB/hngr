"use client";

import * as React from "react";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  BowArrow,
  Building2,
  Calendar,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PanelLeft,
  PieChart,
  Settings2,
  Share,
  SquareTerminal,
  UserPlus,
  KeyRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

const header = {
  items: [
    {
      title: "hngr",
      url: "/about",
      icon: BowArrow,
      version: process.env.NEXT_PUBLIC_COMMIT_HASH,
    },
  ],
};

const data = {
  items: [
    { title: "districts", url: "/", icon: Building2 },
    { title: "timeline", url: "/timeline", icon: Calendar },
    { title: "share", url: "/share", icon: Share },
    { title: "settings", url: "/settings", icon: Settings2 },
  ],
};

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isExpanded = state === "expanded";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-2 list-none">
        {header.items.map((item) => (
          <SidebarMenuItem key={item.title} className="w-full">
            <SidebarMenuButton asChild isActive={pathname === item.url}>
              <a
                href={item.url}
                className="flex items-center justify-between gap-2 w-full"
              >
                <div className="flex items-center gap-2">
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span>{item.title}</span>
                </div>
                <span className="opacity-20 text-xs">{item.version}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarHeader>

      <SidebarContent className="items-center list-none px-2">
        {data.items.map((item) => (
          <SidebarMenuItem key={item.title} className="w-full">
            <SidebarMenuButton asChild isActive={pathname === item.url}>
              <a href={item.url} className="flex items-center gap-2">
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="gap-2 transition-opacity duration-200 flex flex-col items-start">
          <SignedOut>
            <div
              className={`flex flex-col gap-2 w-full ${
                isExpanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
              }`}
            >
              <SignInButton>
                <Button
                  className="w-full justify-center rounded-md py-2 px-4 font-medium transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  variant="default"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  sign in
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button
                  className="w-full justify-center rounded-md py-2 px-4 font-medium transition-colors hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  variant="secondary"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  sign up
                </Button>
              </SignUpButton>
            </div>
            <div
              className={`flex flex-col items-center justify-center gap-2 w-full ${
                isExpanded ? "hidden" : "flex"
              }`}
            >
              <SignInButton>
                <Button size="icon" aria-label="Sign In">
                  <KeyRound className="h-5 w-5" />
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button size="icon" variant={"secondary"} aria-label="Sign Up">
                  <UserPlus className="h-5 w-5" />
                </Button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <UserButton showName={isExpanded} />
          </SignedIn>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
