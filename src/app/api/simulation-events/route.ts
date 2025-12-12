import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CreateSimulationEventTemplateRequest } from '@/lib/supabase/types';

function getUserIdFromAuth(header: string | null): string | null {
  if (!header) return null;
  if (!header.startsWith('Bearer ')) return null;
  return header.replace('Bearer ', '').trim() || null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMine = searchParams.get('includeMine') === 'true';
    const authHeader = request.headers.get('authorization');
    const userId = getUserIdFromAuth(authHeader);

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    let query = supabase
      .from('simulation_event_templates')
      .select(`*, creator:users(id, username, display_name, avatar_url)`)
      .order('created_at', { ascending: false });

    if (includeMine && userId) {
      query = query.or(`status.eq.approved,creator_id.eq.${userId}`);
    } else {
      query = query.eq('status', 'approved');
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (error: any) {
    console.error('Error fetching simulation event templates:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSimulationEventTemplateRequest = await request.json();
    const authHeader = request.headers.get('authorization');
    const userId = getUserIdFromAuth(authHeader);

    if (!userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Verify user is hngr+
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_plus, plus_expires_at')
      .eq('id', userId)
      .single();

    const plusActive = user?.is_plus && (!user.plus_expires_at || new Date(user.plus_expires_at) > new Date());
    if (userError || !plusActive) {
      return NextResponse.json({ error: 'hngr+ membership required to submit templates' }, { status: 403 });
    }

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 422 });
    }

    if (!body.roles || body.roles.length === 0) {
      return NextResponse.json({ error: 'At least one role is required' }, { status: 422 });
    }

    if (!body.text_template?.includes('{{')) {
      return NextResponse.json({ error: 'Template text must reference at least one role via {{role.prop}} syntax' }, { status: 422 });
    }

    const { data, error } = await supabase
      .from('simulation_event_templates')
      .insert({
        creator_id: userId,
        title: body.title.trim(),
        type: body.type,
        roles: body.roles,
        text_template: body.text_template.trim(),
        effect_json: body.effect_json ?? { action: 'none' },
        status: 'approved',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error creating simulation event template:', error);
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 });
  }
}
