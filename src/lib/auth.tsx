'use client';

import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';
import { createSupabaseClientWithToken } from '@/lib/supabase/clerk-client';
import { User as SupabaseUser } from '@/lib/supabase/types';

export function useAuth() {
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useClerkAuth();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Stabilize the getToken function to prevent dependency array changes
  const stableGetToken = useCallback(() => {
    return getToken({ template: 'supabase' });
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    const fetchUser = async () => {
      if (!clerkUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Get the Clerk token and create an authenticated Supabase client
        const token = await stableGetToken();
        const supabase = token ? createSupabaseClientWithToken(token) : null;
        
        if (!supabase) {
          throw new Error('Failed to create authenticated Supabase client');
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', clerkUser.id)
          .maybeSingle();

        if (error) {
          throw new Error(`Database error: ${error.message || 'Unknown error'}`);
        }

        if (!data) {
          console.log('No user data found, creating user for ID:', clerkUser.id);
          
          // Create user via server-side API
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
              displayName: displayName,
              avatarUrl: clerkUser.imageUrl || null,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Error creating user via API:', errorData);
            setUser(null);
          } else {
            const { user: newUser } = await response.json();
            console.log('User created/updated successfully:', newUser);
            setUser(newUser);
          }
        } else {
          setUser(data);
        }
      } catch (error) {
        console.error('Error in useAuth:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          userId: clerkUser?.id,
          isLoaded,
        });
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [clerkUser, isLoaded, stableGetToken]);

  return {
    user,
    loading: loading || !isLoaded,
    isPlus: user?.is_plus || false,
    plusExpiresAt: user?.plus_expires_at || null,
  };
}
