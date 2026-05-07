import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

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

    // Use upsert to handle both creation and updates
    const { data: userRecord, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email,
        username: username || null,
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting user:', upsertError);
      return NextResponse.json({ error: 'Failed to upsert user', details: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: userRecord });

  } catch (error) {
    console.error('Unexpected error in create-user API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
