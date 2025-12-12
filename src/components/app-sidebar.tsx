"use client";

import * as React from "react";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  BowArrow,
  Building2,
  Calendar as CalendarIcon,
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
  Users,
  Heart,
  BadgeCheck,
  Smartphone,
  CirclePlus,
  Calendar,
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
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { SidebarUser } from "./sidebar-user";

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
    { title: "timeline", url: "/timeline", icon: CalendarIcon },
    { title: "friends", url: "/friends", icon: Users },
    { title: "events", url: "/events", icon: Calendar },
    { title: "nominations", url: "/nominations", icon: BadgeCheck },
    { title: "hngr+", url: "/plus", icon: CirclePlus},
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
            <SignInButton>
              <Button
                className={`justify-center rounded-md py-2 px-4 font-medium transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  isExpanded ? "w-full" : "w-auto px-2"
                }`}
                variant={"default"}
                size={isExpanded ? "default" : "icon"}
                aria-label="authenticate"
              >
                <KeyRound className={isExpanded ? "h-4 w-4 mr-2" : "h-5 w-5"} />
                {isExpanded && "authenticate"}
              </Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <SidebarUser showName={isExpanded} />
          </SignedIn>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
