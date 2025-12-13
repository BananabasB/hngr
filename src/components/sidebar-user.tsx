"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useClerk } from "@clerk/nextjs";
import { Plus, Settings, CreditCard, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function SidebarUser({ showName = false }: { showName?: boolean }) {
  const { user, loading } = useAuth();
  const { openUserProfile, signOut } = useClerk();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
        {showName && <div className="w-20 h-4 bg-gray-200 animate-pulse rounded"></div>}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-0 justify-start">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {user.display_name?.[0] || user.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              {user.is_plus && (
                <Badge 
                  variant="secondary" 
                  className="absolute -bottom-1 -right-1 size-5 rounded-full p-0 flex items-center justify-center bg-gradient-to-b from-sidebar to-sidebar-border text-white border border-border"
                >
                  <Plus className="w-2 h-2" />
                </Badge>
              )}
            </div>
            {showName && (
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium truncate">
                  {user.display_name || user.username || 'User'}
                </span>
                {user.is_plus && (
                  <span className="text-xs text-blue-500 font-medium">hngr+</span>
                )}
              </div>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm">
          <div className="font-medium">
            {user.display_name || user.username || 'User'}
          </div>
          <div className="text-muted-foreground text-xs">
            {user.email || 'No email'}
          </div>
          {user.is_plus && (
            <div className="text-blue-500 text-xs font-medium mt-1">hngr+ member</div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openUserProfile()}>
          <Settings className="mr-2 h-4 w-4" />
          user settings
        </DropdownMenuItem>
        {!user.is_plus && (
          <DropdownMenuItem onClick={() => router.push('/pay/checkout')}>
            <CreditCard className="mr-2 h-4 w-4" />
            upgrade to hngr+
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
