import type { ApiMentalHealthResource } from './mental-health-resources';

/**
 * Befrienders Worldwide API - Suicide Prevention Hotlines
 * API: https://findahelpline.com/api/
 */
export async function fetchBefriendersHotlines(countryCode: string = 'GB'): Promise<ApiMentalHealthResource[]> {
  try {
    // First get the country data
    const countryResponse = await fetch(`https://findahelpline.com/api/countries/${countryCode}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HungerGamesApp/1.0'
      }
    });

    if (!countryResponse.ok) {
      throw new Error(`Failed to fetch country data: ${countryResponse.status}`);
    }

    const countryData = await countryResponse.json();

    if (!countryData.hotlines || countryData.hotlines.length === 0) {
      return [];
    }

    // Convert to our format
    return countryData.hotlines.map((hotline: any) => ({
      name: hotline.name || 'Suicide Prevention Helpline',
      description: hotline.description || '24/7 suicide prevention support',
      contacts: {
        phone: hotline.phone || undefined,
        text: hotline.text || undefined,
        website: hotline.website || undefined,
      },
      crisis: true
    }));

  } catch (error) {
    console.error('Failed to fetch Befrienders hotlines:', error);
    return [];
  }
}

/**
 * Samaritans Radar API - UK Mental Health Services
 * This is a hypothetical API - in reality, Samaritans provides some data via their website
 */
export async function fetchSamaritansServices(): Promise<ApiMentalHealthResource[]> {
  try {
    // Note: Samaritans doesn't have a public API, but they have consistent contact info
    // In a real implementation, you might web scrape or use their structured data
    return [
      {
        name: "Samaritans",
        description: "24/7 emotional support for anyone feeling down or desperate",
        contacts: {
          phone: "116 123",
          website: "https://www.samaritans.org"
        },
        crisis: true
      },
      {
        name: "Samaritans Text Service",
        description: "Free, confidential texting service",
        contacts: {
          text: "Text SHOUT to 85258",
          website: "https://www.samaritans.org/get-help/samaritans-textback/"
        },
        crisis: true
      }
    ];
  } catch (error) {
    console.error('Failed to fetch Samaritans services:', error);
    return [];
  }
}

/**
 * Childline UK API - Child and young person support
 */
export async function fetchChildlineServices(): Promise<ApiMentalHealthResource[]> {
  try {
    // Childline provides consistent contact information
    return [
      {
        name: "Childline",
        description: "Free, confidential advice for children and young people under 19",
        contacts: {
          phone: "0800 1111",
          website: "https://www.childline.org.uk"
        },
        crisis: true
      }
    ];
  } catch (error) {
    console.error('Failed to fetch Childline services:', error);
    return [];
  }
}

/**
 * NHS 111 Online - UK Emergency Services
 */
export async function fetchNHSServices(): Promise<ApiMentalHealthResource[]> {
  try {
    return [
      {
        name: "NHS 111",
        description: "24/7 urgent health advice and information",
        contacts: {
          phone: "111",
          website: "https://111.nhs.uk"
        },
        crisis: false
      }
    ];
  } catch (error) {
    console.error('Failed to fetch NHS services:', error);
    return [];
  }
}

/**
 * Mind UK - Mental Health Charity
 */
export async function fetchMindServices(): Promise<ApiMentalHealthResource[]> {
  try {
    return [
      {
        name: "Mind",
        description: "Mental health support and information",
        contacts: {
          phone: "0300 123 3393",
          text: "Text MIND to 86463",
          website: "https://www.mind.org.uk"
        },
        crisis: false
      }
    ];
  } catch (error) {
    console.error('Failed to fetch Mind services:', error);
    return [];
  }
}

/**
 * Papyrus - Prevention of Young Suicide
 */
export async function fetchPapyrusServices(): Promise<ApiMentalHealthResource[]> {
  try {
    return [
      {
        name: "Papyrus",
        description: "Prevention of young suicide - HOPELINEUK",
        contacts: {
          phone: "0800 068 4141",
          text: "Text 07860 039967",
          website: "https://www.papyrus-uk.org"
        },
        crisis: true
      }
    ];
  } catch (error) {
    console.error('Failed to fetch Papyrus services:', error);
    return [];
  }
}

/**
 * Get location-specific mental health resources
 */
export async function getLocationBasedResources(countryCode: string = 'GB'): Promise<ApiMentalHealthResource[]> {
  const resources: ApiMentalHealthResource[] = [];

  try {
    // Fetch country-specific suicide prevention hotlines
    const befriendersHotlines = await fetchBefriendersHotlines(countryCode);
    resources.push(...befriendersHotlines);

    // Add UK-specific services if in UK
    if (countryCode === 'GB') {
      const [samaritans, childline, nhs, mind, papyrus] = await Promise.all([
        fetchSamaritansServices(),
        fetchChildlineServices(),
        fetchNHSServices(),
        fetchMindServices(),
        fetchPapyrusServices()
      ]);

      resources.push(...samaritans, ...childline, ...nhs, ...mind, ...papyrus);
    }

    // Remove duplicates based on name
    const uniqueResources = resources.filter((resource, index, self) =>
      index === self.findIndex(r => r.name === resource.name)
    );

    return uniqueResources;

  } catch (error) {
    console.error('Failed to fetch location-based resources:', error);
    return [];
  }
}

/**
 * Cache for API responses (simple in-memory cache)
 */
const resourceCache = new Map<string, { data: ApiMentalHealthResource[], timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function getCachedLocationResources(countryCode: string = 'GB'): Promise<ApiMentalHealthResource[]> {
  const cacheKey = `resources_${countryCode}`;
  const cached = resourceCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }

  const resources = await getLocationBasedResources(countryCode);
  resourceCache.set(cacheKey, { data: resources, timestamp: Date.now() });

  return resources;
}
