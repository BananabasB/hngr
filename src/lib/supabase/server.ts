import { createClient } from '@supabase/supabase-js';
import { clerkClient, currentUser } from '@clerk/nextjs/server';

// Supabase configuration with proper API keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env.local file.');
}

// Server-side Supabase client with service role key for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create authenticated Supabase client for server-side API routes
export async function createAuthenticatedSupabaseClient() {
  try {
    const user = await currentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get JWT token with Supabase template
    const clerk = await clerkClient();
    const token = await clerk.sessions.getToken(user.id, 'supabase');

    return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  } catch (error) {
    console.error('Error creating Supabase client with Clerk token:', error);
    throw error;
  }
}

// Helper function to get authenticated user for API routes
export async function getAuthenticatedUser() {
  try {
    const user = await currentUser();
    return user;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

// Helper function to get user ID from request (fallback method)
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  try {
    // First try to get user from current session
    const user = await currentUser();
    if (user) {
      return user.id;
    }

    // Fallback: extract from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Decode JWT without verification (for development only)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload.sub;
  } catch (error) {
    console.error('Error getting user ID from request:', error);
    return null;
  }
}

// Legacy function for backward compatibility
export function createSupabaseServerClient() {
  return supabaseAdmin;
}
