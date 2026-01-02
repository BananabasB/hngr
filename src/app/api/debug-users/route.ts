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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (search) {
      // Test the specific search functionality
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .or(`username.ilike.${search},email.eq.${search}`);

      return NextResponse.json({ 
        search,
        results: data,
        error,
        count: data?.length || 0
      });
    } else {
      // Get all users to see what's available
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, username, email, display_name')
        .limit(20);

      return NextResponse.json({ 
        users: data,
        error,
        count: data?.length || 0
      });
    }

  } catch (error) {
    console.error('Error in debug-users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
