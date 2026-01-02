import { supabase } from '../client';
import type { User } from '../types';

/**
 * Sync a Clerk user with Supabase users table via server API
 * This avoids RLS policy issues by using the server-side endpoint
 */
export async function syncUser(clerkUser: {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}) {
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error('User must have an email address');
  }

  const displayName = clerkUser.firstName
    ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`
    : null;

  try {
    const response = await fetch('/api/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: clerkUser.id,
        email: email,
        username: clerkUser.username || null,
        displayName: displayName,
        avatarUrl: clerkUser.imageUrl || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to sync user: ${errorData.error || 'Unknown error'}`);
    }

    const { user } = await response.json();
    return user as User;
  } catch (error) {
    console.error('Error syncing user:', error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUser(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as User;
}

/**
 * Get user by username or email
 */
export async function findUserByIdentifier(identifier: string) {
  // Clean up the identifier - trim whitespace
  const cleanIdentifier = identifier.trim();
  console.log('Looking up user with identifier:', JSON.stringify(cleanIdentifier));
  
  // Try case-insensitive username match first, then exact email match
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`username.ilike.${cleanIdentifier},email.eq.${cleanIdentifier}`)
    .single();

  console.log('Query result:', { data, error });

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      console.log('No user found with identifier:', cleanIdentifier);
      return null;
    }
    console.error('Database error looking up user:', error);
    throw error;
  }
  console.log('Found user:', data);
  return data as User;
}

/**
 * Search users by username or display name
 */
export async function searchUsers(query: string, limit = 10) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data as User[];
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  }
) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

/**
 * Update hngr+ membership status via server API
 * This avoids RLS policy issues by using the server-side endpoint
 */
export async function updatePlusMembership(
  userId: string,
  isPlus: boolean,
  plusExpiresAt?: string | null
) {
  try {
    const response = await fetch('/api/user/update-plus-membership', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        isPlus,
        plusExpiresAt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update plus membership: ${errorData.error || 'Unknown error'}`);
    }

    const { user } = await response.json();
    return user as User;
  } catch (error) {
    console.error('Error updating plus membership:', error);
    throw error;
  }
}
