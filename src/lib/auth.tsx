'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { User as SupabaseUser } from '@/lib/supabase/types';
import { isHngrPlusEnabled } from '@/lib/plus';

export function useAuth() {
  const { user: clerkUser, isLoaded } = useUser();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    const fetchUser = async () => {
      if (!clerkUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const displayName = [clerkUser.firstName, clerkUser.lastName]
          .filter(Boolean)
          .join(' ') || clerkUser.username || null;

        const response = await fetch('/api/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            username: clerkUser.username || null,
            displayName,
            avatarUrl: clerkUser.imageUrl || null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `Failed to sync user (${response.status})`);
        }

        const { user: syncedUser } = await response.json();
        setUser(syncedUser);
      } catch (error) {
        console.warn('Falling back to Clerk user in useAuth:', error);
        // Keep the app usable with a local fallback instead of failing hard.
        setUser({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          username: clerkUser.username || null,
          display_name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || null,
          avatar_url: clerkUser.imageUrl || null,
          is_plus: !isHngrPlusEnabled(),
          plus_expires_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [clerkUser, isLoaded]);

  return {
    user,
    loading: loading || !isLoaded,
    isPlus: isHngrPlusEnabled()
      ? Boolean((user as (SupabaseUser & { isPlus?: boolean }) | null)?.is_plus ?? (user as (SupabaseUser & { isPlus?: boolean }) | null)?.isPlus)
      : true,
    plusExpiresAt: (user as (SupabaseUser & { plusExpiresAt?: string | null }) | null)?.plus_expires_at ?? (user as (SupabaseUser & { plusExpiresAt?: string | null }) | null)?.plusExpiresAt ?? null,
  };
}
