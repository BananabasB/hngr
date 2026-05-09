import { NextRequest, NextResponse } from 'next/server';
import { getMentalHealthGuidance } from '@/lib/mental-health-resources';
import { analyzeContent } from '@/lib/profanity-detection';
import { nominationRepository } from '@/repositories/drizzle/nomination.repository';
import { friendshipRepository } from '@/repositories/drizzle/friendship.repository';
import { notificationRepository } from '@/repositories/drizzle/notification.repository';
import type { CreateNominationRequest } from '@/lib/supabase/types';
import { db } from '@/db';
import { nominations } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Perspective API configuration (free tier)
const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

interface ModerationResult {
  flagged: boolean;
  categories: {
    sexual: boolean;
    hate: boolean;
    harassment: boolean;
    'self-harm': boolean;
    'sexual/minors': boolean;
    'hate/threatening': boolean;
    'violence/graphic': boolean;
    'self-harm/intent': boolean;
    'self-harm/instructions': boolean;
    'harassment/threatening': boolean;
    violence: boolean;
  };
  category_scores: {
    sexual: number;
    hate: number;
    harassment: number;
    'self-harm': number;
    'sexual/minors': number;
    'hate/threatening': number;
    'violence/graphic': number;
    'self-harm/intent': number;
    'self-harm/instructions': number;
    'harassment/threatening': number;
    violence: number;
  };
  mentalHealthGuidance?: any;
}

/**
 * Check content against Perspective API (free alternative)
 */
async function moderateNominationContentServer(
  tributeName: string,
  tributeBio?: string,
  message?: string
): Promise<ModerationResult> {
  const contents = [
    tributeName,
    tributeBio,
    message,
  ].filter(Boolean) as string[];

  if (contents.length === 0) {
    return {
      flagged: false,
      categories: {
        sexual: false,
        hate: false,
        harassment: false,
        'self-harm': false,
        'sexual/minors': false,
        'hate/threatening': false,
        'violence/graphic': false,
        'self-harm/intent': false,
        'self-harm/instructions': false,
        'harassment/threatening': false,
        violence: false,
      },
      category_scores: {
        sexual: 0,
        hate: 0,
        harassment: 0,
        'self-harm': 0,
        'sexual/minors': 0,
        'hate/threatening': 0,
        'violence/graphic': 0,
        'self-harm/intent': 0,
        'self-harm/instructions': 0,
        'harassment/threatening': 0,
        violence: 0,
      },
    };
  }

  // Check each piece of content
  const results = [];
  for (const content of contents) {
    if (PERSPECTIVE_API_KEY) {
      try {
        const response = await fetch(`${PERSPECTIVE_API_URL}?key=${PERSPECTIVE_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            comment: { text: content },
            languages: ['en'],
            requestedAttributes: {
              TOXICITY: {},
              SEVERE_TOXICITY: {},
              IDENTITY_ATTACK: {},
              INSULT: {},
              PROFANITY: {},
              THREAT: {},
              SEXUALLY_EXPLICIT: {},
              FLIRTATION: {},
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const attributes = data.attributeScores;

          results.push({
            flagged: Object.values(attributes).some((attr: any) => attr.summaryScore.value > 0.7),
            categories: {
              sexual: (attributes.SEXUALLY_EXPLICIT?.summaryScore.value || 0) > 0.7,
              hate: (attributes.IDENTITY_ATTACK?.summaryScore.value || 0) > 0.7,
              harassment: (attributes.INSULT?.summaryScore.value || 0) > 0.7 || (attributes.TOXICITY?.summaryScore.value || 0) > 0.7,
              'self-harm': false,
              'sexual/minors': false,
              'hate/threatening': (attributes.IDENTITY_ATTACK?.summaryScore.value || 0) > 0.7,
              'violence/graphic': (attributes.THREAT?.summaryScore.value || 0) > 0.7,
              'self-harm/intent': false,
              'self-harm/instructions': false,
              'harassment/threatening': (attributes.THREAT?.summaryScore.value || 0) > 0.7,
              violence: (attributes.THREAT?.summaryScore.value || 0) > 0.7,
            },
            category_scores: {
              sexual: attributes.SEXUALLY_EXPLICIT?.summaryScore.value || 0,
              hate: attributes.IDENTITY_ATTACK?.summaryScore.value || 0,
              harassment: Math.max(attributes.INSULT?.summaryScore.value || 0, attributes.TOXICITY?.summaryScore.value || 0),
              'self-harm': 0,
              'sexual/minors': 0,
              'hate/threatening': attributes.IDENTITY_ATTACK?.summaryScore.value || 0,
              'violence/graphic': attributes.THREAT?.summaryScore.value || 0,
              'self-harm/intent': 0,
              'self-harm/instructions': 0,
              'harassment/threatening': attributes.THREAT?.summaryScore.value || 0,
              violence: attributes.THREAT?.summaryScore.value || 0,
            },
          });
        } else {
          results.push({ flagged: false, categories: {}, category_scores: {} });
        }
      } catch (error) {
        console.error('Perspective API error:', error);
        results.push({ flagged: false, categories: {}, category_scores: {} });
      }
    } else {
      // Fallback: Basic content analysis (no profanity detection)
      const analysis = await analyzeContent(content);
      results.push({
        flagged: analysis.hasProfanity,
        categories: {
          sexual: analysis.categories.sexual,
          hate: analysis.categories.hate,
          harassment: analysis.categories.profanity,
          'self-harm': analysis.categories['self-harm'],
          'sexual/minors': false, // Would need more sophisticated detection
          'hate/threatening': analysis.categories.threats,
          'violence/graphic': analysis.categories.violence,
          'self-harm/intent': analysis.categories['self-harm'],
          'self-harm/instructions': false, // Would need more sophisticated detection
          'harassment/threatening': analysis.categories.threats,
          violence: analysis.categories.violence,
        },
        category_scores: {
          sexual: analysis.categories.sexual ? 0.9 : 0,
          hate: analysis.categories.hate ? 0.9 : 0,
          harassment: analysis.score,
          'self-harm': analysis.categories['self-harm'] ? 0.95 : 0,
          'sexual/minors': 0, // Would need more sophisticated detection
          'hate/threatening': analysis.categories.threats ? 0.85 : 0,
          'violence/graphic': analysis.categories.violence ? 0.85 : 0,
          'self-harm/intent': analysis.categories['self-harm'] ? 0.95 : 0,
          'self-harm/instructions': 0, // Would need more sophisticated detection
          'harassment/threatening': analysis.categories.threats ? 0.85 : 0,
          violence: analysis.categories.violence ? 0.85 : 0,
        },
      });
    }
  }

  // Combine results - if any content is flagged, the whole nomination is flagged
  const combinedCategories = {
    sexual: results.some(r => r.categories.sexual),
    hate: results.some(r => r.categories.hate),
    harassment: results.some(r => r.categories.harassment),
    'self-harm': results.some(r => r.categories['self-harm']),
    'sexual/minors': results.some(r => r.categories['sexual/minors']),
    'hate/threatening': results.some(r => r.categories['hate/threatening']),
    'violence/graphic': results.some(r => r.categories['violence/graphic']),
    'self-harm/intent': results.some(r => r.categories['self-harm/intent']),
    'self-harm/instructions': results.some(r => r.categories['self-harm/instructions']),
    'harassment/threatening': results.some(r => r.categories['harassment/threatening']),
    violence: results.some(r => r.categories.violence),
  };

  const combinedResult: ModerationResult = {
    flagged: results.some(r => r.flagged),
    categories: combinedCategories,
    category_scores: {
      sexual: Math.max(...results.map(r => r.category_scores.sexual || 0)),
      hate: Math.max(...results.map(r => r.category_scores.hate || 0)),
      harassment: Math.max(...results.map(r => r.category_scores.harassment || 0)),
      'self-harm': Math.max(...results.map(r => r.category_scores['self-harm'] || 0)),
      'sexual/minors': Math.max(...results.map(r => r.category_scores['sexual/minors'] || 0)),
      'hate/threatening': Math.max(...results.map(r => r.category_scores['hate/threatening'] || 0)),
      'violence/graphic': Math.max(...results.map(r => r.category_scores['violence/graphic'] || 0)),
      'self-harm/intent': Math.max(...results.map(r => r.category_scores['self-harm/intent'] || 0)),
      'self-harm/instructions': Math.max(...results.map(r => r.category_scores['self-harm/instructions'] || 0)),
      'harassment/threatening': Math.max(...results.map(r => r.category_scores['harassment/threatening'] || 0)),
      violence: Math.max(...results.map(r => r.category_scores.violence || 0)),
    },
  };

  return combinedResult;
}

/**
 * Get a user-friendly error message based on moderation results
 */
function getModerationErrorMessage(result: ModerationResult): string {
  if (!result.flagged) return '';

  const violations: string[] = [];

  if (result.categories['sexual/minors']) {
    violations.push('sexual content involving minors');
  }
  if (result.categories['hate/threatening']) {
    violations.push('hate speech or threats');
  }
  if (result.categories['harassment/threatening']) {
    violations.push('harassing or threatening content');
  }
  if (result.categories['violence/graphic']) {
    violations.push('graphic violence');
  }
  if (result.categories['self-harm/intent'] || result.categories['self-harm/instructions']) {
    violations.push('self-harm content');
  }
  if (result.categories.hate) {
    violations.push('hateful content');
  }
  if (result.categories.harassment) {
    violations.push('harassment');
  }
  if (result.categories.sexual) {
    violations.push('sexual content');
  }
  if (result.categories.violence) {
    violations.push('violent content');
  }
  if (result.categories['self-harm']) {
    violations.push('self-harm references');
  }

  let message = '';

  if (violations.length === 0) {
    message = 'Your content was flagged by our moderation system. Please review and try again.';
  } else {
    message = `Your nomination contains ${violations.join(', ')}. Please revise your content to comply with our community guidelines.`;
  }

  // Add mental health guidance if available
  if (result.mentalHealthGuidance) {
    const guidance = result.mentalHealthGuidance;
    message += `\n\n${guidance.title}\n${guidance.message}\n\nHelpful resources:`;

    guidance.resources.forEach((resource: any) => {
      message += `\n• ${resource.name}`;
      if (resource.phone) message += ` - Call ${resource.phone}`;
      if (resource.text) message += ` - Text ${resource.text}`;
      message += `\n  ${resource.website}`;
    });

    if (guidance.urgent) {
      message += '\n\n⚠️ If this is an emergency, please call emergency services (911) immediately.';
    }
  }

  return message;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, nominationData, requireFriendship = false }: {
      userId?: string;
      nominationData: CreateNominationRequest;
      requireFriendship?: boolean;
    } = body;

    if (!nominationData?.tribute_name || !nominationData?.recipient_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Optionally verify they are friends (only if nominator is logged in)
    if (requireFriendship && userId) {
      const friends = await friendshipRepository.areFriends(userId, nominationData.recipient_id);
      if (!friends) {
        return NextResponse.json(
          { error: 'You can only nominate tributes to your friends' },
          { status: 403 }
        );
      }
    }

    // Moderate content before allowing nomination
    const moderationResult = await moderateNominationContentServer(
      nominationData.tribute_name,
      nominationData.tribute_bio,
      nominationData.message
    );

    if (moderationResult.flagged) {
      // Fetch mental health guidance for the flagged content
      const guidance = await getMentalHealthGuidance(moderationResult.categories);

      const errorMessage = getModerationErrorMessage(moderationResult);
      return NextResponse.json(
        {
          error: errorMessage,
          moderationResult: { ...moderationResult, mentalHealthGuidance: guidance }
        },
        { status: 400 }
      );
    }

    // Check if this exact tribute (by name) has already been nominated to this recipient
    const existing = await db
      .select()
      .from(nominations)
      .where(
        and(
          eq(nominations.nominatorId, userId || sql`NULL`),
          eq(nominations.recipientId, nominationData.recipient_id),
          eq(nominations.tributeName, nominationData.tribute_name),
          eq(nominations.status, 'pending')
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'You have already nominated this tribute to this user' },
        { status: 409 }
      );
    }

    // Create the nomination with embedded tribute data
    const data = await nominationRepository.create({
      nominatorId: userId || null,
      recipientId: nominationData.recipient_id,
      tributeName: nominationData.tribute_name,
      tributePronouns: nominationData.tribute_pronouns,
      tributeImageUrl: nominationData.tribute_image_url || null,
      tributeBio: nominationData.tribute_bio || null,
      message: nominationData.message || null,
      income: nominationData.income || null,
      status: 'pending',
      votes: 0,
    });

    // Create notification for recipient
    await notificationRepository.create({
      userId: nominationData.recipient_id,
      type: 'nomination_received',
      title: 'New tribute nomination',
      message: 'You received a new tribute nomination',
      link: '/nominations',
    });

    return NextResponse.json({ success: true, nomination: data });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
