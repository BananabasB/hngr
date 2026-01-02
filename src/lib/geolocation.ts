interface GeolocationResponse {
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
}

const CACHE_KEY = 'user_geolocation';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Free IP geolocation API - ipapi.co
// Alternative: ip-api.com, ipinfo.io, etc.
async function fetchGeolocation(): Promise<GeolocationResponse> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch geolocation: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      country: data.country_name || '',
      countryCode: data.country_code || '',
      region: data.region || '',
      city: data.city || '',
    };
  } catch (error) {
    console.error('Geolocation fetch failed:', error);
    // Return default values on error
    return {
      country: '',
      countryCode: '',
      region: '',
      city: '',
    };
  }
}

export async function getUserGeolocation(): Promise<GeolocationResponse> {
  // Check cache first
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      } catch (e) {
        // Invalid cache, continue with fetch
      }
    }
  }

  // Fetch fresh data
  const geolocation = await fetchGeolocation();

  // Cache the result
  if (typeof window !== 'undefined') {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: geolocation,
      timestamp: Date.now(),
    }));
  }

  return geolocation;
}

export async function isUserInUK(): Promise<boolean> {
  const geo = await getUserGeolocation();
  return geo.countryCode === 'GB' || geo.country.toLowerCase().includes('united kingdom');
}

export async function isUserInAffectedRegion(): Promise<boolean> {
  const geo = await getUserGeolocation();
  // Currently only UK is affected, but can be extended
  return geo.countryCode === 'GB' || geo.country.toLowerCase().includes('united kingdom');
}
