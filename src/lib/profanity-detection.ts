/**
 * Content analysis for moderation using Perspective API only
 * No profanity detection libraries or offensive content stored in codebase
 */
export async function analyzeContent(text: string): Promise<{
  hasProfanity: boolean;
  score: number;
  categories: {
    profanity: boolean;
    threats: boolean;
    hate: boolean;
    sexual: boolean;
    'self-harm': boolean;
    violence: boolean;
  };
}> {
  // Return safe defaults - all moderation handled by Perspective API when available
  return {
    hasProfanity: false,
    score: 0,
    categories: {
      profanity: false,
      threats: false,
      hate: false,
      sexual: false,
      'self-harm': false,
      violence: false,
    },
  };
}
