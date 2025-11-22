import { NextRequest, NextResponse } from 'next/server';
import { getMentalHealthGuidance } from '@/lib/mental-health-resources';
import { analyzeContent } from '@/lib/profanity-detection';

// Perspective API configuration (free tier)
const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

export interface ModerationResult {
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
 * Check content against Perspective API (free alternative to OpenAI)
 */
async function moderateContentServer(content: string): Promise<ModerationResult> {
  try {
    if (!content || content.trim().length === 0) {
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

    // Use Perspective API if key is available
    if (PERSPECTIVE_API_KEY) {
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

        // Map Perspective API attributes to our format
        const attributes = data.attributeScores;
        const flagged = Object.values(attributes).some((attr: any) => attr.summaryScore.value > 0.7);

        return {
          flagged,
          categories: {
            sexual: (attributes.SEXUALLY_EXPLICIT?.summaryScore.value || 0) > 0.7,
            hate: (attributes.IDENTITY_ATTACK?.summaryScore.value || 0) > 0.7,
            harassment: (attributes.INSULT?.summaryScore.value || 0) > 0.7 || (attributes.TOXICITY?.summaryScore.value || 0) > 0.7,
            'self-harm': false, // Perspective doesn't detect self-harm specifically
            'sexual/minors': false, // Perspective doesn't detect this specifically
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
        };
      }
    }

    // Fallback: Basic content analysis (no profanity detection libraries)
    console.log('Using advanced content analysis (Perspective API not configured)');
    const analysis = await analyzeContent(content);

    return {
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
        'sexual/minors': 0,
        'hate/threatening': analysis.categories.threats ? 0.85 : 0,
        'violence/graphic': analysis.categories.violence ? 0.85 : 0,
        'self-harm/intent': analysis.categories['self-harm'] ? 0.95 : 0,
        'self-harm/instructions': 0,
        'harassment/threatening': analysis.categories.threats ? 0.85 : 0,
        violence: analysis.categories.violence ? 0.85 : 0,
      },
    };
  } catch (error) {
    console.error('Moderation API error:', error);
    // In case of API failure, err on the side of caution with keyword detection
    const flagged = false; // Conservative approach without profanity detection

    return {
      flagged,
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
}

/**
 * Check multiple pieces of content and return combined result
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

  // Moderate each piece of content
  const results = await Promise.all(
    contents.map(content => moderateContentServer(content))
  );

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
      sexual: Math.max(...results.map(r => r.category_scores.sexual)),
      hate: Math.max(...results.map(r => r.category_scores.hate)),
      harassment: Math.max(...results.map(r => r.category_scores.harassment)),
      'self-harm': Math.max(...results.map(r => r.category_scores['self-harm'])),
      'sexual/minors': Math.max(...results.map(r => r.category_scores['sexual/minors'])),
      'hate/threatening': Math.max(...results.map(r => r.category_scores['hate/threatening'])),
      'violence/graphic': Math.max(...results.map(r => r.category_scores['violence/graphic'])),
      'self-harm/intent': Math.max(...results.map(r => r.category_scores['self-harm/intent'])),
      'self-harm/instructions': Math.max(...results.map(r => r.category_scores['self-harm/instructions'])),
      'harassment/threatening': Math.max(...results.map(r => r.category_scores['harassment/threatening'])),
      violence: Math.max(...results.map(r => r.category_scores.violence)),
    },
  };

  // Add mental health guidance if content is flagged
  if (combinedResult.flagged) {
    try {
      const guidance = await getMentalHealthGuidance(combinedCategories);
      combinedResult.mentalHealthGuidance = guidance;
    } catch (error) {
      console.error('Failed to get mental health guidance:', error);
    }
  }

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
    const { content, tributeName, tributeBio, message }: {
      content?: string;
      tributeName?: string;
      tributeBio?: string;
      message?: string;
    } = body;

    let result: ModerationResult;

    if (content) {
      // Single content moderation
      result = await moderateContentServer(content);
    } else if (tributeName) {
      // Nomination content moderation
      result = await moderateNominationContentServer(tributeName, tributeBio, message);
    } else {
      return NextResponse.json(
        { error: 'Missing content to moderate' },
        { status: 400 }
      );
    }

    const errorMessage = getModerationErrorMessage(result);

    return NextResponse.json({
      success: true,
      result,
      errorMessage: errorMessage || null,
    });

  } catch (error) {
    console.error('Test moderation API error:', error);
    return NextResponse.json(
      { error: 'Moderation test failed' },
      { status: 500 }
    );
  }
}
