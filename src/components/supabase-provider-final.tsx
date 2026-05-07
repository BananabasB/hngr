"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

interface SupabaseContextType {
  supabase: ReturnType<typeof createClient<Database>>;
  user: any;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { userId, getToken } = useClerkAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    const syncUser = async () => {
      try {
        // Just create a simple user object from Clerk
        // We'll handle authentication at the API level
        const clerkUser = {
          id: userId,
          aud: 'authenticated',
        };
        
        setUser(clerkUser);
        setError(null);
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    syncUser();
  }, [userId]);

  return (
    <SupabaseContext.Provider value={{
      supabase,
      user,
      loading,
      error,
      signOut
    }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}
