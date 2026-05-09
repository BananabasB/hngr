import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { userRepository } from '@/repositories/drizzle/user.repository';
import { serializeUser } from '@/lib/drizzle/serializers';

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated using Clerk's auth helper
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, email, username, displayName, avatarUrl } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure the authenticated user is creating their own record
    if (userId !== clerkUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userData = {
      id: userId,
      email,
      username: username || null,
      displayName: displayName || null,
      avatarUrl: avatarUrl || null,
    };

    let userRecord;
    try {
      userRecord = await userRepository.syncUser(userData);
    } catch (upsertError: any) {
      // Username collisions are non-critical; retry without username so auth can proceed.
      if (userData.username) {
        userRecord = await userRepository.syncUser({
          ...userData,
          username: null,
        });
      } else {
        console.error('Error upserting user:', upsertError);
        return NextResponse.json({ error: upsertError.message || 'Failed to upsert user' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, user: serializeUser(userRecord) });

  } catch (error) {
    console.error('Unexpected error in create-user API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
