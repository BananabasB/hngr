import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your .env.local file.');
}

// Create a Supabase client configured for Clerk authentication (for use in components)
export function useSupabaseClient() {
  const { getToken } = useAuth();
  
  return useMemo(() => {
    // Try different client configurations based on key format
    const clientConfig: any = {
      global: {
        // Get the session token from Clerk
        fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
          const clerkToken = await getToken({ template: 'supabase' });

          const headers = new Headers(options.headers);
          headers.set('Authorization', `Bearer ${clerkToken}`);
          headers.set('apikey', supabaseAnonKey);

          return fetch(url, {
            ...options,
            headers,
          });
        },
      },
      auth: {
        detectSessionInUrl: false,
        persistSession: false,
      },
    };

    // For legacy JWT format (eyJ...), use standard auth
    // For new format (sb_publishable_), use custom auth
    if (supabaseAnonKey.startsWith('eyJ')) {
      console.log('Using legacy JWT format for Supabase key');
      clientConfig.auth = {
        persistSession: false,
        detectSessionInUrl: false,
      };
    } else {
      console.log('Using new publishable key format for Supabase key');
      clientConfig.auth = {
        persistSession: false,
        detectSessionInUrl: false,
      };
    }

    return createClient(supabaseUrl, supabaseAnonKey, clientConfig);
  }, [getToken]);
}

// Create a Supabase client with a token (for use outside components)
export function createSupabaseClientWithToken(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('apikey', supabaseAnonKey);

        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
    auth: {
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

// Regular supabase client for server-side or unauthenticated use
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    detectSessionInUrl: false,
  }
});
