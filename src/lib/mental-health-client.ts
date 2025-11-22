import type { ApiMentalHealthResource, MentalHealthResource, ResourceGuidance } from './mental-health-resources';

/**
 * Client-side mental health resource fetching
 * Calls the API route instead of direct API calls to avoid exposing API keys
 */

export async function getLocationBasedResourcesClient(countryCode: string = 'GB'): Promise<ApiMentalHealthResource[]> {
  try {
    const response = await fetch(`/api/mental-health?country=${encodeURIComponent(countryCode)}`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.warn('API returned error, using fallback resources:', data.error);
      return data.resources || [];
    }

    return data.resources || [];
  } catch (error) {
    console.error('Failed to fetch mental health resources from API:', error);

    // Return minimal fallback resources
    return [
      {
        name: "Emergency Services",
        description: "Call emergency services immediately if in danger",
        contacts: {
          phone: "999",
        },
        crisis: true,
      },
      {
        name: "NHS 111",
        description: "Urgent medical advice",
        contacts: {
          phone: "111",
          website: "https://111.nhs.uk",
        },
        crisis: false,
      }
    ];
  }
}

/**
 * Convert API resource format to our internal format
 */
function convertApiResource(apiResource: ApiMentalHealthResource): MentalHealthResource {
  return {
    name: apiResource.name,
    description: apiResource.description,
    phone: apiResource.contacts.phone,
    text: apiResource.contacts.text,
    website: apiResource.contacts.website || '',
    crisis: apiResource.crisis,
  };
}

/**
 * Get appropriate mental health resources based on moderation categories (client-side)
 */
export async function getMentalHealthGuidanceClient(
  categories: Record<string, boolean>,
  countryCode: string = 'GB'
): Promise<ResourceGuidance> {
  const flaggedCategories = Object.entries(categories)
    .filter(([, flagged]) => flagged)
    .map(([category]) => category);

  // Check for crisis-level situations first
  const hasCrisisContent = flaggedCategories.some(cat =>
    ['sexual/minors', 'self-harm', 'violence/graphic', 'harassment/threatening'].includes(cat)
  );

  try {
    // Fetch location-specific resources from API route
    const apiResources = await getLocationBasedResourcesClient(countryCode);
    const convertedResources = apiResources.map(convertApiResource);

    // Prioritize resources based on flagged categories
    let relevantResources: MentalHealthResource[] = [];

    if (flaggedCategories.includes('sexual/minors') || flaggedCategories.includes('sexual')) {
      // Include all crisis resources for sexual content
      relevantResources = convertedResources.filter(r => r.crisis);
    } else if (flaggedCategories.includes('self-harm')) {
      // Include suicide prevention resources
      relevantResources = convertedResources.filter(r =>
        r.name.toLowerCase().includes('suicide') ||
        r.name.toLowerCase().includes('samaritan') ||
        r.name.toLowerCase().includes('crisis') ||
        r.crisis
      );
    } else if (flaggedCategories.includes('harassment') || flaggedCategories.includes('harassment/threatening')) {
      // Include support resources
      relevantResources = convertedResources.filter(r =>
        r.name.toLowerCase().includes('domestic') ||
        r.name.toLowerCase().includes('violence') ||
        r.name.toLowerCase().includes('support') ||
        r.crisis
      );
    } else if (hasCrisisContent) {
      // Include all crisis resources
      relevantResources = convertedResources.filter(r => r.crisis);
    } else {
      // Include general mental health resources
      relevantResources = convertedResources.filter(r =>
        r.name.toLowerCase().includes('mind') ||
        r.name.toLowerCase().includes('mental') ||
        r.name.toLowerCase().includes('health') ||
        !r.crisis
      );
    }

    // Ensure we have at least some resources
    if (relevantResources.length === 0) {
      relevantResources = convertedResources.slice(0, 3);
    }

    const urgent = hasCrisisContent || flaggedCategories.includes('self-harm');

    let title = "We're Here to Help";
    let message = "We detected content that may indicate someone needs support. ";

    if (urgent) {
      title = "Immediate Support Available";
      message += "If you or someone you know is in crisis, please reach out to these resources immediately.";
    } else {
      message += "If you need support or know someone who might, these resources are available.";
    }

    return {
      title,
      message,
      resources: relevantResources,
      urgent,
    };

  } catch (error) {
    console.error('Failed to fetch mental health resources:', error);

    // Fallback to emergency services if API fails
    const fallbackResources: MentalHealthResource[] = [
      {
        name: "Emergency Services",
        description: "Call emergency services immediately if in danger",
        phone: "999",
        website: "",
        crisis: true,
      },
      {
        name: "NHS 111",
        description: "Urgent medical advice",
        phone: "111",
        website: "https://111.nhs.uk",
        crisis: false,
      }
    ];

    return {
      title: "Emergency Support",
      message: "We're unable to load specific resources right now. Please contact emergency services if you're in immediate danger.",
      resources: fallbackResources,
      urgent: true,
    };
  }
}
