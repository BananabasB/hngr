import { NextRequest, NextResponse } from 'next/server';
import { getCachedLocationResources } from '@/lib/mental-health-apis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country') || 'GB';

    const resources = await getCachedLocationResources(countryCode);

    return NextResponse.json({
      success: true,
      resources,
    });
  } catch (error) {
    console.error('Failed to fetch mental health resources:', error);

    // Return fallback resources
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch resources',
      resources: [
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
      ],
    });
  }
}
