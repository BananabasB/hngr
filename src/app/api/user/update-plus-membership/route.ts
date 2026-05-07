import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, isPlus, plusExpiresAt } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (typeof isPlus !== 'boolean') {
      return NextResponse.json({ error: 'isPlus must be a boolean' }, { status: 400 });
    }

    // Ensure the authenticated user is updating their own record or this is a webhook call
    // You might want to add additional logic here for admin/webhook verification
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update user's plus membership status
    const { data: userRecord, error: updateError } = await supabaseAdmin
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

    return NextResponse.json({ success: true, user: userRecord });

  } catch (error) {
    console.error('Unexpected error in update-plus-membership API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
