'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@/lib/supabase/types';

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
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', clerkUser.id)
          .single();

        if (error) {
          console.error('Error fetching user:', error);
          setUser(null);
        } else {
          setUser(data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [clerkUser, isLoaded]);

  return {
    user,
    loading: loading || !isLoaded,
    isPlus: user?.is_plus || false,
    plusExpiresAt: user?.plus_expires_at || null,
  };
}
