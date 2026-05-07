"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs/dist/components';
import { Database } from '@/lib/database.types';

interface SupabaseContextType {
  supabase: ReturnType<typeof createClientComponentClient<Database>>;
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

  const supabase = createClientComponentClient<Database>();

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

    const getUser = async () => {
      try {
        // Use the native Clerk-Supabase integration
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          // If user doesn't exist in Supabase, create them
          if (error.message.includes('Invalid claim')) {
            const token = await getToken({ template: 'supabase' });
            if (token) {
              const { data: signInData, error: signInError } = await supabase.auth.signInWithIdToken({
                provider: 'oidc',
                token: token,
                options: {
                  redirectTo: window.location.origin,
                },
              });
              
              if (signInError) throw signInError;
              setUser(signInData.user);
              setError(null);
            } else {
              throw new Error('No authentication token available');
            }
          } else {
            throw error;
          }
        } else {
          setUser(user);
          setError(null);
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();
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
