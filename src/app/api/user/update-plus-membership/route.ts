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
    const { userId, isPlus, plusExpiresAt } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (typeof isPlus !== 'boolean') {
      return NextResponse.json({ error: 'isPlus must be a boolean' }, { status: 400 });
    }

    // Update user's plus membership status
    const { data: user, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        is_plus: isPlus,
        plus_expires_at: plusExpiresAt || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating plus membership:', updateError);
      return NextResponse.json({ error: 'Failed to update membership', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error('Unexpected error in update-plus-membership API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
