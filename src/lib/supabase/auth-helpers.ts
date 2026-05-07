import { createClient } from '@supabase/supabase-js';
import { supabase } from './client';
import { SupabaseClient } from '@supabase/supabase-js';

// Get an authenticated Supabase client for client-side use
// This should be used within components that have access to Clerk hooks
export function createAuthenticatedSupabaseClient(token: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}
