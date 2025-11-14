# HNGR Nomination System Setup Guide

This guide will help you set up the complete nomination system with Supabase backend and Clerk authentication.

## Prerequisites

- Node.js 18+ installed
- A Clerk account (for authentication)
- A Supabase account (for database)

## Step 1: Set Up Supabase

### 1.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `hngr` (or whatever you prefer)
   - **Database Password**: Generate a secure password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait for it to initialize (~2 minutes)

### 1.2 Run the Database Schema

1. In your Supabase project, go to the **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `/supabase/schema.sql` from this project
4. Paste it into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - this is correct!

### 1.3 Get Your Supabase Credentials

1. In your Supabase project, go to **Settings** > **API**
2. Find these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public** key (under "Project API keys")
3. Copy these - you'll need them for `.env.local`

### 1.4 Configure Authentication (Optional but Recommended)

For RLS (Row Level Security) to work with Clerk:

1. Go to **Authentication** > **Providers** in Supabase
2. You can enable additional auth providers if needed
3. Note: We're using Clerk for auth, but Supabase will store the data

## Step 2: Set Up Clerk (Already Configured)

Your Clerk is already set up based on the existing code. Make sure your `.env.local` has:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

## Step 3: Configure Environment Variables

Create or update your `.env.local` file in the project root:

```env
# Clerk Authentication (existing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (new - add these)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting Your Keys:

#### Clerk Keys:
- Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
- Select your application
- Go to **API Keys** in the sidebar
- Copy both keys

#### Supabase Keys:
- Already obtained in Step 1.3

## Step 4: Install Dependencies

The dependencies are already installed, but if you need to reinstall:

```bash
npm install
```

## Step 5: Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## Features Overview

### 1. Friends System (`/friends`)

- Add friends by username or email
- Accept/reject friend requests
- View your friends list
- Remove friends

### 2. Nominations System (`/nominations`)

- View nominations you've received
- View nominations you've sent
- Accept or reject nominations
- Vote on nominations
- See nomination statistics

### 3. Create Nominations (`/nominate`)

- Select a friend
- Choose one of their tributes
- Add an optional message
- Send the nomination

### 4. Districts (existing - `/`)

Will be integrated to show nominated tributes

### 5. Timeline (existing - `/timeline`)

Will show events involving nominated tributes

## Database Schema Overview

The following tables have been created:

- **users**: Synced with Clerk users
- **friendships**: Friend connections and requests
- **tributes**: Shareable tributes that can be nominated
- **nominations**: Nomination records with status tracking
- **nomination_votes**: Voting system for nominations
- **games**: Saved game states
- **game_tributes**: Which tributes are in which games
- **notifications**: Real-time notification system

## Row Level Security (RLS)

All tables have RLS policies configured to ensure:

- Users can only see their own data
- Friends can see each other's relevant data
- Public tributes are visible to everyone
- Nominations are only visible to nominator and recipient

## Next Steps

### Integration with Existing Tribute System

To integrate nominations with your existing localStorage-based tribute system:

1. **Export tributes to Supabase**: Create tributes in the database that can be nominated
2. **Import nominations**: When accepting a nomination, add the tribute to your local game
3. **Sync on game creation**: Optionally save games to Supabase for sharing

### Additional Features to Build

- **Notifications bell**: Show unread notification count in header
- **Tribute browser**: Browse public tributes to nominate
- **Leaderboards**: Most nominated tributes
- **Game sharing**: Share completed games with friends
- **Real-time updates**: Use Supabase subscriptions for live notifications

## Troubleshooting

### "Missing Supabase environment variables"

- Make sure `.env.local` exists in the project root
- Verify both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Restart the dev server after adding env variables

### "User not found" when adding friends

- Make sure the user has signed in at least once (this syncs them to Supabase)
- Check that you're using the correct username or email
- Usernames are case-sensitive

### Database connection errors

- Verify your Supabase project URL is correct
- Check that the anon key is valid
- Ensure your Supabase project is not paused (free tier projects pause after inactivity)

### TypeScript errors

Run the type checker:

```bash
npx tsc --noEmit
```

Most type errors should be resolved by the type definitions in `/src/lib/supabase/types.ts`

## Development Workflow

### Making Schema Changes

1. Update `/supabase/schema.sql`
2. Run the updated SQL in Supabase SQL Editor
3. Update TypeScript types in `/src/lib/supabase/types.ts`
4. Update service functions as needed

### Testing the API

You can test Supabase functions directly:

```typescript
import { getFriends } from '@/lib/supabase/services/friends';

// In a React component
const friends = await getFriends(userId);
console.log(friends);
```

## Security Best Practices

1. **Never commit `.env.local`** - it's already in `.gitignore`
2. **Use environment variables** for all secrets
3. **RLS policies** protect your data at the database level
4. **Clerk handles authentication** - never store passwords yourself
5. **Validate user input** on both client and server

## Support

If you run into issues:

1. Check the browser console for errors
2. Check the Supabase logs (Database > Logs)
3. Verify your environment variables are correct
4. Make sure the database schema is properly installed

## License

This is part of the HNGR project.
