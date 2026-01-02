import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { userId, email, username, displayName, avatarUrl } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use upsert to handle both creation and updates
    const { data: user, error: upsertError } = await supabaseAdmin
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

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error('Unexpected error in create-user API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
