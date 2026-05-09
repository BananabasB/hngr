"use client";

import * as React from "react";
import {
  BowArrow,
  Building2,
  Calendar as CalendarIcon,
  Settings2,
  Share,
  KeyRound,
  Users,
  BadgeCheck,
  CirclePlus,
  CalendarPlus,
  Sparkles,
  RefreshCcw as Sync,
  Trophy,
  HelpCircle,
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
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { SidebarUser } from "./sidebar-user";
import { SeasonSelector } from "./season-selector";
import { useOnboarding } from "@/lib/onboarding-context";

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
    { title: "events", url: "/events", icon: CalendarPlus },
    { title: "nominations", url: "/nominations", icon: BadgeCheck },
    { title: "hngr+", url: "/plus", icon: CirclePlus},
    { title: "pundit", url: "/pundit", icon: Sparkles},
    { title: "seasons", url: "/seasons", icon: Trophy },
    { title: "share", url: "/share", icon: Share },
    { title: "sync", url: "/sync", icon: Sync },
    { title: "settings", url: "/settings", icon: Settings2 },
  ],
};

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { startOnboarding } = useOnboarding();
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

      <SidebarContent data-onboarding="sidebar" className="items-center list-none px-2">
        <Show when="signed-in">
          {isExpanded && (
            <div className="py-2 border-b mb-2 w-full">
              <SeasonSelector className="flex-col items-start gap-2 w-full" />
            </div>
          )}
        </Show>

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
          <Show when="signed-in">
            <SidebarMenuItem className="w-full list-none">
              <SidebarMenuButton asChild onClick={startOnboarding}>
                <button className="flex items-center gap-2 w-full cursor-pointer">
                  <HelpCircle className="h-4 w-4" />
                  <span>help</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </Show>
          <Show when="signed-out">
            <div className="flex flex-col gap-2 w-full">
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
              <SidebarMenuButton asChild isActive={pathname === "/waitlist"}>
                <a href="/waitlist" className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4" />
                    <span>join waitlist</span>
                </a>
              </SidebarMenuButton>
            </div>
          </Show>

          <Show when="signed-in">
            <SidebarUser showName={isExpanded} />
          </Show>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
