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
} from "lucide-react";

import { usePathname } from "next/navigation";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar";

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

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
      <SidebarRail />
    </Sidebar>
  );
}