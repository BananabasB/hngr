import { supabase } from '../client';
import type { User } from '../types';

/**
 * Sync a Clerk user with Supabase users table
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

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: clerkUser.id,
        email,
        username: clerkUser.username,
        display_name: displayName,
        avatar_url: clerkUser.imageUrl,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'id',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data as User;
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
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`username.eq.${identifier},email.eq.${identifier}`)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw error;
  }
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
 * Update hngr+ membership status
 */
export async function updatePlusMembership(
  userId: string,
  isPlus: boolean,
  plusExpiresAt?: string | null
) {
  const { data, error } = await supabase
    .from('users')
    .update({
      is_plus: isPlus,
      plus_expires_at: plusExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as User;
}
