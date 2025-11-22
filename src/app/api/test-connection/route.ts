import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testUser = searchParams.get('userId');

    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      return NextResponse.json({
        error: 'Supabase connection failed',
        details: testError.message,
        code: testError.code
      }, { status: 500 });
    }

    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };

    let userTest: any = null;
    if (testUser) {
      // Test getting a specific user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', testUser)
        .single();

      userTest = {
        found: !!userData,
        error: userError?.message,
        userData: userData ? { id: userData.id, email: userData.email, username: userData.username } : null
      };

      // Test nominations query for this user
      if (userData) {
        const { data: nominationsData, error: nominationsError } = await supabase
          .from('nominations')
          .select('count')
          .eq('recipient_id', testUser)
          .limit(1);

        userTest.nominationsTest = {
          success: !nominationsError,
          error: nominationsError?.message,
          count: nominationsData?.length || 0
        };
      }
    }

    return NextResponse.json({
      status: 'connected',
      environment: envCheck,
      testResult: testData,
      userTest
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
