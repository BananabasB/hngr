"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [supabase, setSupabase] = useState<any>(null);

  const signOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setSupabase(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setSupabase(null);
      setLoading(false);
      return;
    }

    const initializeSupabase = async () => {
      try {
        // Get the custom Supabase JWT token
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          throw new Error('No authentication token available');
        }

        // Create Supabase client with the JWT token
        const client = createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        );

        // Set the session with the JWT token
        const { data, error } = await client.auth.setSession({
          access_token: token,
          refresh_token: token,
        });

        if (error) throw error;
        
        setUser(data.user);
        setSupabase(client);
        setError(null);
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setUser(null);
        setSupabase(null);
      } finally {
        setLoading(false);
      }
    };

    initializeSupabase();
  }, [userId, getToken]);

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
