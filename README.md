![hngr](/assets/readmeBanner.svg "hngr")

## a way to simulate survival games

put your own contestants to the test using hngr, a website that simulates survival games using hngr, coming soon.

## Features

- **Tribute Nomination System**: Nominate characters to compete in simulated Hunger Games
- **Community Moderation**: Users can report inappropriate nominations, which are automatically hidden after 3 reports
- **Content Moderation**: OpenAI Moderation API integration prevents inappropriate content from being submitted
- **Friend-Based Gameplay**: Connect with friends to nominate and vote on tributes

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Perspective API Key for content moderation (highly recommended - free tier available)
# Get from: https://console.cloud.google.com/apis/credentials
# Enables hate speech detection for terms like "nazi", "hitler", etc.
PERSPECTIVE_API_KEY=your_perspective_api_key_here

# Supabase Configuration (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Clerk Configuration (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

### Free Content Moderation & Mental Health Support

The app uses **Google's Perspective API** (free tier) to:
- **Prevent inappropriate nominations** before they are submitted
- **Validate report details** to prevent abusive reporting
- **Automatically block content** flagged for toxicity, hate speech, harassment, and threats
- **Provide location-specific mental health resources** when inappropriate content is detected

**Moderation Features:**
- **Toxicity Detection**: Identifies harmful or abusive content
- **Hate Speech Detection**: Blocks discriminatory language
- **Threat Detection**: Prevents violent threats and harassment
- **AI-Powered**: Uses Google's Perspective API for accurate content moderation

**Dynamic Resource System:**
- **API-powered**: Fetches up-to-date mental health resources from verified APIs
- **Location-aware**: Automatically provides UK resources for UK users (Befrienders Worldwide, Samaritans, NHS, etc.)
- **Crisis detection**: Shows emergency hotlines for self-harm, sexual violence, and other crisis content

**Supported APIs:**
- **Befrienders Worldwide**: Suicide prevention hotlines worldwide
- **Samaritans**: UK emotional support (116 123)
- **Childline**: UK child support (0800 1111)
- **NHS 111**: UK urgent health advice
- **Mind**: UK mental health charity

**Security Note:** All API calls are made server-side through Next.js API routes to protect API keys. Client components call these routes instead of direct API access.

**Setup Options:**
1. **Basic**: Without API key - conservative moderation approach
2. **Enhanced (Recommended)**: Get a Perspective API key for AI-powered detection (60 requests/minute free)

When content is flagged, users see relevant, up-to-date mental health resources and support information.

Get your Perspective API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (optional but recommended).