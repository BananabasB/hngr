import { createClient } from '@supabase/supabase-js';

// Create a Supabase client for server-side operations
export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Missing Supabase environment variables for server operations');
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}
