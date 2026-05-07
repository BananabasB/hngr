import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('DEBUG: Testing authentication');
    
    const user = await getAuthenticatedUser();
    console.log('DEBUG: User result:', user ? { id: user.id } : 'No user');
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: 'User not authenticated'
      }, { status: 401 });
    }

    const supabase = await createAuthenticatedSupabaseClient();

    // Test if we can query seasons table
    const { data: seasons, error: queryError } = await supabase
      .from('seasons')
      .select('id, name, owner_id')
      .eq('owner_id', user.id)
      .limit(1);

    console.log('DEBUG: Query result:', { seasons, queryError });

    if (queryError) {
      return NextResponse.json({ 
        error: 'Query failed',
        debug: queryError.message,
        details: queryError
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      debug: 'Authentication and database access working',
      user: { id: user.id },
      seasonsCount: seasons?.length || 0
    });

  } catch (error) {
    console.error('DEBUG: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error',
      debug: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}
