import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { simulationEventTemplates } from '@/db/schema';
import { getDbUserById, getRequestUserId, isPlusActive } from '@/lib/drizzle/server';
import { serializeSimulationEventTemplate } from '@/lib/drizzle/serializers';
import { CreateSimulationEventTemplateRequest } from '@/lib/supabase/types';
import { isHngrPlusEnabled } from '@/lib/plus';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMine = searchParams.get('includeMine') === 'true';
    const userId = await getRequestUserId(request);

    const templates = await db.query.simulationEventTemplates.findMany({
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: (template: any, { desc }: any) => [desc(template.createdAt)],
    });

    const filtered = templates.filter((template: any) => {
      if (includeMine && userId) {
        return template.status === 'approved' || template.creatorId === userId;
      }
      return template.status === 'approved';
    });

    return NextResponse.json({ data: filtered.map(serializeSimulationEventTemplate) });
  } catch (error: any) {
    console.error('Error fetching simulation event templates:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSimulationEventTemplateRequest = await request.json();
    const userId = await getRequestUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const user = await getDbUserById(userId);
    if (isHngrPlusEnabled() && !isPlusActive(user)) {
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

    const created = await db
      .insert(simulationEventTemplates)
      .values({
        creatorId: userId,
        title: body.title.trim(),
        type: body.type,
        roles: body.roles,
        textTemplate: body.text_template.trim(),
        effectJson: body.effect_json ?? null,
        status: 'approved',
      })
      .returning();

    return NextResponse.json({ data: serializeSimulationEventTemplate(created[0]) });
  } catch (error: any) {
    console.error('Error creating simulation event template:', error);
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 });
  }
}
