![hngr](/assets/readmeBanner.svg "hngr")

## a way to simulate survival games

put your own contestants to the test using hngr, a website that simulates survival games.

## Features

- **Tribute Nomination System**: Nominate characters to compete in simulated survival games
- **Simulation Engine**: Day-by-day game simulation with AI-generated events (kills, alliances, item finds, feasts, and more)
- **Social Mechanics**: Trust, alliances, and relationships between tributes
- **Community Moderation**: Users can report inappropriate nominations, which are automatically hidden after 3 reports
- **Content Moderation**: Perspective API integration prevents inappropriate content from being submitted, with mental health resources displayed for flagged content
- **Friend System**: Connect with friends to nominate and vote on tributes
- **Seasons & Games**: Organize tributes into seasons with multiple games
- **AI Assistant ("Pundit")**: Chat with an AI about your games and simulation events
- **Device Sync**: WebRTC-based synchronization between devices
- **Plus Subscriptions**: Premium tier via Stripe

## Tech Stack

Next.js 16, React 19, TypeScript, Tailwind CSS, Drizzle ORM, Supabase (Postgres), Clerk (auth), Stripe (payments), assistant-ui + AI SDK, Google Perspective API (moderation)

## Quick Start

```bash
npm install
cp .env.local.example .env.local  # fill in your keys
npm run dev
```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Clerk Configuration (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Perspective API Key (recommended — free tier available, 60 req/min)
# Get from: https://console.cloud.google.com/apis/credentials
PERSPECTIVE_API_KEY=your_perspective_api_key_here
```

## Content Moderation & Mental Health Support

The app uses **Google's Perspective API** (free tier) to:
- Prevent inappropriate nominations before submission
- Block content flagged for toxicity, hate speech, harassment, and threats
- Provide location-specific mental health resources when inappropriate content is detected

Without a Perspective API key, the app falls back to built-in profanity detection.

**Mental Health Resources:**
- Befrienders Worldwide — suicide prevention hotlines worldwide
- Samaritans — UK emotional support (116 123)
- Childline — UK child support (0800 1111)
- NHS 111 — UK urgent health advice
- Mind — UK mental health charity

All API calls are made server-side through Next.js API routes to protect API keys.
