import { supabase } from '../client';
import type { Nomination, NominationWithDetails, CreateNominationRequest, NominationReport } from '../types';
import { areFriends } from './friends';
import { moderateNominationContent, getModerationErrorMessage } from '../../moderation';

/**
 * Create a nomination
 * Tribute info is provided by the nominator, making nominations self-contained polls
 */
/**
 * Create a nomination (legacy function - use API route instead)
 * @deprecated Use the /api/nominations endpoint for new implementations
 */
export async function createNomination(
  userId: string,
  request: CreateNominationRequest,
  requireFriendship = false // optional: set to true to require friendship
) {
  throw new Error('This function is deprecated. Use the /api/nominations endpoint instead.');
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
      )
    `
    )
    .eq('nominator_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get report count and status for each nomination
  const nominationsWithReports = await Promise.all(
    data.map(async (nomination) => {
      const [reportCount, userReported] = await Promise.all([
        supabase
          .from('nomination_reports')
          .select('id', { count: 'exact', head: true })
          .eq('nomination_id', nomination.id),
        getNominationReportStatus(nomination.id, userId),
      ]);

      return {
        ...nomination,
        report_count: reportCount.count || 0,
        user_reported: userReported,
      };
    })
  );

  return nominationsWithReports as NominationWithDetails[];
}

/**
 * Get nominations received by a user
 */
export async function getReceivedNominations(userId: string): Promise<NominationWithDetails[]> {
  console.log('getReceivedNominations called with userId:', userId);

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
      )
    `
    )
    .eq('recipient_id', userId)
    .neq('status', 'hidden') // Hide reported nominations
    .order('created_at', { ascending: false });

  console.log('Supabase query result:', { data: data ? 'data received' : null, error });

  if (error) {
    console.error('Supabase error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error(`Database error: ${error.message} (code: ${error.code})`);
  }

  // Get report count and status for each nomination
  console.log('Processing', data.length, 'nominations for reports');
  const nominationsWithReports = await Promise.all(
    data.map(async (nomination, index) => {
      console.log(`Processing nomination ${index + 1}/${data.length}: ${nomination.id}`);

      let reportCount = 0;
      let userReported = false;

      try {
        // Get report count
        const countResult = await supabase
          .from('nomination_reports')
          .select('id', { count: 'exact', head: true })
          .eq('nomination_id', nomination.id);

        if (countResult.error) {
          console.warn(`Could not get report count for nomination ${nomination.id}:`, countResult.error);
        } else {
          reportCount = countResult.count || 0;
        }
      } catch (countError) {
        console.warn(`Error getting report count for nomination ${nomination.id}:`, countError);
      }

      try {
        // Get user report status
        userReported = await getNominationReportStatus(nomination.id, userId);
      } catch (statusError) {
        console.warn(`Error getting report status for nomination ${nomination.id}:`, statusError);
        // Keep userReported as false (default)
      }

      return {
        ...nomination,
        report_count: reportCount,
        user_reported: userReported,
      };
    })
  );

  console.log('Successfully processed all nominations');
  return nominationsWithReports as NominationWithDetails[];
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
    title: 'nomination accepted',
    message: `your nomination was accepted!`,
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
    title: 'nomination declined',
    message: `your nomination was declined`,
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

/**
 * Report a nomination for inappropriate content
 */
export async function reportNomination(
  nominationId: string,
  userId: string,
  reason: NominationReport['reason'],
  details?: string
) {
  // Moderate report details if provided
  if (details) {
    const moderationResult = await moderateNominationContent(details);
    if (moderationResult.flagged) {
      const errorMessage = getModerationErrorMessage(moderationResult);
      throw new Error(`Report details contain inappropriate content: ${errorMessage}`);
    }
  }

  // Check if user already reported this nomination
  const { data: existing } = await supabase
    .from('nomination_reports')
    .select('*')
    .eq('nomination_id', nominationId)
    .eq('reporter_id', userId)
    .single();

  if (existing) {
    throw new Error('you have already reported this nomination');
  }

  // Check if user can see this nomination (is nominator or recipient)
  const { data: nomination } = await supabase
    .from('nominations')
    .select('id')
    .eq('id', nominationId)
    .or(`nominator_id.eq.${userId},recipient_id.eq.${userId}`)
    .single();

  if (!nomination) {
    throw new Error('nomination not found or you cannot report this nomination');
  }

  // Create the report
  const { error } = await supabase
    .from('nomination_reports')
    .insert({
      nomination_id: nominationId,
      reporter_id: userId,
      reason,
      details,
    });

  if (error) throw error;
}

/**
 * Get user's report status for a nomination
 */
export async function getNominationReportStatus(nominationId: string, userId: string) {
  console.log(`Checking report status for nomination ${nominationId} by user ${userId}`);

  try {
    const { data, error } = await supabase
      .from('nomination_reports')
      .select('*')
      .eq('nomination_id', nominationId)
      .eq('reporter_id', userId)
      .single();

    console.log(`Supabase query result for nomination_reports:`, {
      hasData: !!data,
      error: error ? {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      } : null
    });

    if (error && error.code !== 'PGRST116') {
      console.error(`Error checking report status for nomination ${nominationId}:`, {
        error: error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        nominationId,
        userId
      });
      throw new Error(`Database error checking report status: ${error.message} (code: ${error.code})`);
    }

    const hasReported = !!data;
    console.log(`User ${userId} ${hasReported ? 'has' : 'has not'} reported nomination ${nominationId}`);
    return hasReported;
  } catch (error) {
    console.error(`Failed to get nomination report status for ${nominationId}:`, {
      error,
      nominationId,
      userId,
      errorType: typeof error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
