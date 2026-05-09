# hngr — AI Agent Context

## Project Overview

hngr is a Next.js 16 (Turbopack) web app that simulates survival games (Hunger Games-style). Users nominate characters (tributes), run simulations, and watch AI-generated events unfold day by day.

**Stack:** Next.js 16.1.1, React 19.2.3, TypeScript, Tailwind CSS v4, shadcn/ui, Drizzle ORM + Supabase (Postgres), Clerk (auth), Stripe (payments), assistant-ui + AI SDK (chat), Perspective API (moderation), WebRTC (device sync).

## Project Structure

```
src/
├── app/           # Next.js App Router pages
│   ├── api/       # API routes (moderation, mental-health, webhooks, etc.)
│   ├── auth/      # Sign-in/sign-up pages
│   ├── nominate/  # Nomination form
│   ├── nominations/ # View/manage nominations
│   ├── seasons/   # Season management
│   ├── friends/   # Friend system
│   ├── pundit/    # AI assistant chat
│   ├── sync/      # Device-to-device sync
│   ├── settings/  # User settings
│   ├── plus/      # Stripe Plus subscriptions
│   ├── pay/       # Payment pages
│   └── ...        # Other pages (about, events, timeline, etc.)
├── components/    # React components (shadcn/ui + custom)
│   ├── auth/      # Auth-related components
│   ├── assistant-ui/ # AI chat UI components
│   ├── ui/        # shadcn/ui primitives
│   └── ...
├── db/            # Drizzle schema (schema.ts) and DB connection (index.ts)
├── lib/           # Business logic
│   ├── supabase/  # Supabase services (nominations, games, seasons, friends, etc.)
│   ├── drizzle/   # Drizzle server/serializers
│   ├── device-sync/ # WebRTC device sync (state-serialization, webrtc, etc.)
│   ├── assistant-runtime.ts  # AI SDK + assistant-ui bridge
│   ├── pundit-runtime.tsx    # Pundit chat runtime
│   ├── pundit-chat-store.ts  # Zustand chat store
│   ├── simulation.ts         # Simulation engine
│   ├── events.ts             # Event templates (759 lines, ~100+ templates)
│   ├── social.ts             # Trust/alliance mechanics
│   ├── moderation.ts         # Perspective API + fallback moderation
│   ├── profanity-detection.ts # Local profanity detection
│   ├── mental-health-*.ts    # Mental health resource APIs
│   ├── geolocation.ts        # Location detection for regional resources
│   ├── storage-service*.ts   # IndexedDB/localStorage persistence
│   ├── state-context*.tsx    # React context for game state
│   └── ...
├── repositories/  # Data access layer
│   ├── drizzle/   # Drizzle-based repository implementations
│   ├── friendship.repository.ts
│   ├── nomination.repository.ts
│   ├── notification.repository.ts
│   └── user.repository.ts
├── hooks/         # Custom React hooks
├── types/         # Type definitions
└── __tests__/     # Test files
```

## Key Architecture Decisions

### Database
- Supabase Postgres with Drizzle ORM
- Schema in `src/db/schema.ts` — 15+ tables (users, tributes, nominations, games, seasons, friendships, notifications, game_events, simulation_event_templates, chat_threads, etc.)
- Repository pattern in `src/repositories/` for data access
- Drizzle queries in `src/repositories/drizzle/`
- Migrations in `drizzle/`

### Authentication
- Clerk for auth (middleware.ts defines public routes)
- Clerk webhooks sync users to the local `users` table
- `src/lib/auth.tsx` — Auth context provider

### Content Moderation
- Two-tier: Perspective API (primary) → local profanity detection (fallback)
- Hate speech detection includes known hate symbols/terms (nazi, hitler, kkk, etc.)
- Mental health resources shown when harmful content is detected
- Location-aware resources (UK-specific via Befrienders, Samaritans, NHS, etc.)

### Simulation Engine
- `src/lib/simulation.ts` — Day-by-day simulation (`simulateDay`, `simulateGame`)
- Event-driven: each day generates 8-10 events from shuffled templates
- Event templates in `src/lib/events.ts` — typed with roles, conditions, and effects
- Social mechanics in `src/lib/social.ts` — trust, alliances
- Supports both client-side and server-side execution

### AI Assistant ("Pundit")
- Built on assistant-ui + AI SDK
- Chat threads stored in DB (`chat_threads`, `chat_messages`)
- Simulation event tool for in-chat game interaction

### Device Sync
- WebRTC-based P2P sync (DS Suitcase-style)
- State serialization, chunking, conflict resolution
- QR code pairing

### Payments
- Stripe integration for "Plus" subscription tier
- Pages in `src/app/plus/` and `src/app/pay/`

### Styling
- Tailwind CSS v4 with shadcn/ui components
- Motion library for animations
- next-themes for dark/light mode

## Key Conventions

- **Components:** shadcn/ui pattern (Radix primitives + Tailwind + class-variance-authority)
- **State:** Zustand stores + React Context
- **API routes:** Next.js App Router route handlers
- **DB access:** Repository pattern via Drizzle
- **Client-side persistence:** localStorage + IndexedDB
- **Naming:** kebab-case for files, camelCase for functions/variables

## Environment Variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

Optional: `PERSPECTIVE_API_KEY` (free — Google Perspective API for moderation)

## Scripts

- `npm run dev` — Start dev server with Turbopack
- `npm run build` — Production build with Turbopack
- `npm run db:generate` — Generate Drizzle migrations
- `npm run db:migrate` — Run migrations
- `npm run db:push` — Push schema changes
