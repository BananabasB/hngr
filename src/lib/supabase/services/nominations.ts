import { supabase } from '../client';
import type { Nomination, NominationWithDetails, CreateNominationRequest } from '../types';
import { areFriends } from './friends';

/**
 * Create a nomination
 */
export async function createNomination(
  userId: string,
  request: CreateNominationRequest
) {
  // Verify they are friends
  const friends = await areFriends(userId, request.recipient_id);
  if (!friends) {
    throw new Error('You can only nominate tributes to your friends');
  }

  // Check if this tribute has already been nominated to this recipient
  const { data: existing } = await supabase
    .from('nominations')
    .select('*')
    .eq('nominator_id', userId)
    .eq('recipient_id', request.recipient_id)
    .eq('tribute_id', request.tribute_id)
    .eq('status', 'pending')
    .single();

  if (existing) {
    throw new Error('You have already nominated this tribute to this friend');
  }

  // Create the nomination
  const { data, error } = await supabase
    .from('nominations')
    .insert({
      nominator_id: userId,
      recipient_id: request.recipient_id,
      tribute_id: request.tribute_id,
      message: request.message || null,
      status: 'pending',
      votes: 0,
    })
    .select()
    .single();

  if (error) throw error;

  // Create notification for recipient
  await supabase.from('notifications').insert({
    user_id: request.recipient_id,
    type: 'nomination_received',
    title: 'New tribute nomination',
    message: `You received a new tribute nomination`,
    link: '/nominations',
  });

  return data as Nomination;
}

/**
 * Get nominations sent by a user
 */
export async function getSentNominations(userId: string): Promise<NominationWithDetails[]> {
  const { data, error } = await supabase
    .from('nominations')
    .select(
      `
      *,
      recipient:recipient_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      tribute:tribute_id (
        id,
        name,
        pronouns,
        image_url,
        bio
      )
    `
    )
    .eq('nominator_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as NominationWithDetails[];
}

/**
 * Get nominations received by a user
 */
export async function getReceivedNominations(userId: string): Promise<NominationWithDetails[]> {
  const { data, error } = await supabase
    .from('nominations')
    .select(
      `
      *,
      nominator:nominator_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      tribute:tribute_id (
        id,
        name,
        pronouns,
        image_url,
        bio,
        owner_id
      )
    `
    )
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as NominationWithDetails[];
}

/**
 * Get pending nominations received by a user
 */
export async function getPendingNominations(userId: string): Promise<NominationWithDetails[]> {
  const { data, error } = await supabase
    .from('nominations')
    .select(
      `
      *,
      nominator:nominator_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      tribute:tribute_id (
        id,
        name,
        pronouns,
        image_url,
        bio,
        owner_id
      )
    `
    )
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .order('votes', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as NominationWithDetails[];
}

/**
 * Accept a nomination
 */
export async function acceptNomination(nominationId: string, userId: string) {
  const { data, error } = await supabase
    .from('nominations')
    .update({
      status: 'accepted',
    })
    .eq('id', nominationId)
    .eq('recipient_id', userId) // Only recipient can accept
    .select()
    .single();

  if (error) throw error;

  // Create notification for nominator
  const nomination = data as Nomination;
  await supabase.from('notifications').insert({
    user_id: nomination.nominator_id,
    type: 'nomination_accepted',
    title: 'Nomination accepted',
    message: `Your nomination was accepted!`,
    link: '/nominations',
  });

  return nomination;
}

/**
 * Reject a nomination
 */
export async function rejectNomination(nominationId: string, userId: string) {
  const { data, error } = await supabase
    .from('nominations')
    .update({
      status: 'rejected',
    })
    .eq('id', nominationId)
    .eq('recipient_id', userId) // Only recipient can reject
    .select()
    .single();

  if (error) throw error;

  // Create notification for nominator
  const nomination = data as Nomination;
  await supabase.from('notifications').insert({
    user_id: nomination.nominator_id,
    type: 'nomination_rejected',
    title: 'Nomination declined',
    message: `Your nomination was declined`,
    link: '/nominations',
  });

  return nomination;
}

/**
 * Delete a nomination (only by nominator before it's accepted)
 */
export async function deleteNomination(nominationId: string, userId: string) {
  const { error } = await supabase
    .from('nominations')
    .delete()
    .eq('id', nominationId)
    .eq('nominator_id', userId) // Only nominator can delete
    .eq('status', 'pending'); // Can only delete pending nominations

  if (error) throw error;
}

/**
 * Vote on a nomination (like/upvote)
 */
export async function voteOnNomination(nominationId: string, userId: string) {
  // Check if user already voted
  const { data: existing } = await supabase
    .from('nomination_votes')
    .select('*')
    .eq('nomination_id', nominationId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Remove vote
    const { error } = await supabase
      .from('nomination_votes')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
    return { voted: false };
  } else {
    // Add vote
    const { error } = await supabase
      .from('nomination_votes')
      .insert({
        nomination_id: nominationId,
        user_id: userId,
      });

    if (error) throw error;
    return { voted: true };
  }
}

/**
 * Get user's vote status for a nomination
 */
export async function getNominationVoteStatus(nominationId: string, userId: string) {
  const { data, error } = await supabase
    .from('nomination_votes')
    .select('*')
    .eq('nomination_id', nominationId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return !!data;
}

/**
 * Get nomination statistics
 */
export async function getNominationStats(userId: string) {
  const [sent, received, pending] = await Promise.all([
    supabase
      .from('nominations')
      .select('id', { count: 'exact', head: true })
      .eq('nominator_id', userId),
    supabase
      .from('nominations')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId),
    supabase
      .from('nominations')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('status', 'pending'),
  ]);

  return {
    sent: sent.count || 0,
    received: received.count || 0,
    pending: pending.count || 0,
  };
}
