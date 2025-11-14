import { supabase } from '../client';
import type { Friendship, FriendshipWithUser, User } from '../types';
import { findUserByIdentifier } from './users';

/**
 * Send a friend request
 */
export async function sendFriendRequest(userId: string, friendIdentifier: string) {
  // Find the friend by username or email
  const friend = await findUserByIdentifier(friendIdentifier);
  if (!friend) {
    throw new Error('User not found');
  }

  if (friend.id === userId) {
    throw new Error('Cannot send friend request to yourself');
  }

  // Check if friendship already exists
  const { data: existing } = await supabase
    .from('friendships')
    .select('*')
    .eq('user_id', userId)
    .eq('friend_id', friend.id)
    .single();

  if (existing) {
    throw new Error('Friend request already sent');
  }

  // Create the friend request
  const { data, error } = await supabase
    .from('friendships')
    .insert({
      user_id: userId,
      friend_id: friend.id,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  // Create notification for friend
  await supabase.from('notifications').insert({
    user_id: friend.id,
    type: 'friend_request',
    title: 'New friend request',
    message: `You have a new friend request`,
    link: '/friends',
  });

  return data as Friendship;
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(friendshipId: string, userId: string) {
  const { data, error } = await supabase
    .from('friendships')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', friendshipId)
    .eq('friend_id', userId) // Only the recipient can accept
    .select()
    .single();

  if (error) throw error;

  // Create notification for requester
  const friendship = data as Friendship;
  await supabase.from('notifications').insert({
    user_id: friendship.user_id,
    type: 'friend_accepted',
    title: 'Friend request accepted',
    message: `Your friend request was accepted`,
    link: '/friends',
  });

  return friendship;
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(friendshipId: string, userId: string) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .eq('friend_id', userId); // Only the recipient can reject

  if (error) throw error;
}

/**
 * Remove a friend
 */
export async function removeFriend(userId: string, friendId: string) {
  // Delete both directions of the friendship
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

  if (error) throw error;
}

/**
 * Get all friends for a user
 */
export async function getFriends(userId: string): Promise<FriendshipWithUser[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      `
      *,
      friend:friend_id (
        id,
        username,
        display_name,
        avatar_url,
        email
      )
    `
    )
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (error) throw error;
  return data as FriendshipWithUser[];
}

/**
 * Get pending friend requests (received)
 */
export async function getPendingFriendRequests(userId: string): Promise<FriendshipWithUser[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      `
      *,
      friend:user_id (
        id,
        username,
        display_name,
        avatar_url,
        email
      )
    `
    )
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  return data as FriendshipWithUser[];
}

/**
 * Get sent friend requests
 */
export async function getSentFriendRequests(userId: string): Promise<FriendshipWithUser[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      `
      *,
      friend:friend_id (
        id,
        username,
        display_name,
        avatar_url,
        email
      )
    `
    )
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  return data as FriendshipWithUser[];
}

/**
 * Check if two users are friends
 */
export async function areFriends(userId: string, friendId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id', userId)
    .eq('friend_id', friendId)
    .eq('status', 'accepted')
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return !!data;
}
