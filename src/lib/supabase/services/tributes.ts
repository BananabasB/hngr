import { supabase } from '../client';
import type { Tribute, CreateTributeRequest } from '../types';

/**
 * Create a new tribute
 */
export async function createTribute(userId: string, tribute: CreateTributeRequest) {
  const { data, error } = await supabase
    .from('tributes')
    .insert({
      owner_id: userId,
      name: tribute.name,
      pronouns: tribute.pronouns,
      image_url: tribute.image_url || null,
      bio: tribute.bio || null,
      is_public: tribute.is_public || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Tribute;
}

/**
 * Get all tributes for a user
 */
export async function getUserTributes(userId: string) {
  const { data, error } = await supabase
    .from('tributes')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Tribute[];
}

/**
 * Get a specific tribute by ID
 */
export async function getTribute(tributeId: string) {
  const { data, error } = await supabase
    .from('tributes')
    .select('*')
    .eq('id', tributeId)
    .single();

  if (error) throw error;
  return data as Tribute;
}

/**
 * Update a tribute
 */
export async function updateTribute(
  tributeId: string,
  userId: string,
  updates: Partial<CreateTributeRequest>
) {
  const { data, error } = await supabase
    .from('tributes')
    .update(updates)
    .eq('id', tributeId)
    .eq('owner_id', userId) // Only owner can update
    .select()
    .single();

  if (error) throw error;
  return data as Tribute;
}

/**
 * Delete a tribute
 */
export async function deleteTribute(tributeId: string, userId: string) {
  const { error } = await supabase
    .from('tributes')
    .delete()
    .eq('id', tributeId)
    .eq('owner_id', userId); // Only owner can delete

  if (error) throw error;
}

/**
 * Get tributes that can be nominated (friends' tributes + public tributes)
 */
export async function getNominableTributes(userId: string) {
  // Get friends' tributes and public tributes
  const { data, error } = await supabase
    .from('tributes')
    .select(
      `
      *,
      owner:owner_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .or(
      `is_public.eq.true,owner_id.in.(select friend_id from friendships where user_id = '${userId}' and status = 'accepted')`
    )
    .neq('owner_id', userId) // Exclude own tributes
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get friend's tributes for nomination
 */
export async function getFriendTributes(friendId: string) {
  const { data, error } = await supabase
    .from('tributes')
    .select('*')
    .eq('owner_id', friendId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Tribute[];
}
