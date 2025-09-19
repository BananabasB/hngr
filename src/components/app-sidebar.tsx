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
  PieChart,
  Settings2,
  Share,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const header = {
  items: [
    {
      title: "hngr",
      url: "/about",
      icon: BowArrow,
      isActive: false,
      version: process.env.NEXT_PUBLIC_COMMIT_HASH,
    },
  ],
};

const data = {
  items: [
    {
      title: "districts",
      url: "#",
      icon: Building2,
      isActive: true,
    },
    {
      title: "timeline",
      url: "#",
      icon: Calendar,
    },
    {
      title: "share",
      url: "#",
      icon: Share,
    },
    {
      title: "settings",
      url: "#",
      icon: Settings2,
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-2 list-none">
        {header.items.map((item) => (
          <SidebarMenuItem key={item.title} className="w-full">
            <SidebarMenuButton asChild isActive={item.isActive}>
              <a
                href={item.url}
                className="flex items-center justify-between gap-2 w-full"
              >
                <div className="flex items-center gap-2">
                  {item.icon && <item.icon className="h-5 w-5" />}
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
            <SidebarMenuButton asChild isActive={item.isActive}>
              <a href={item.url} className="flex items-center gap-2">
                {item.icon && <item.icon />}
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
