import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function getUserIdFromAuth(header: string | null): string | null {
  if (!header) return null;
  if (!header.startsWith('Bearer ')) return null;
  return header.replace('Bearer ', '').trim() || null;
}

function isPlusActive(user: { is_plus: boolean; plus_expires_at: string | null } | null) {
  if (!user?.is_plus) return false;
  if (!user.plus_expires_at) return true;
  return new Date(user.plus_expires_at) > new Date();
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = getUserIdFromAuth(authHeader);

    if (!userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Check user's hngr+ status
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_plus, plus_expires_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isPlus = isPlusActive(user);

    return NextResponse.json({ isPlus });
  } catch (error: any) {
    console.error('Error checking hngr+ status:', error);
    return NextResponse.json({ error: error.message || 'Failed to check status' }, { status: 500 });
  }
}
