import { NextRequest, NextResponse } from 'next/server';
import { getDbUserById, getRequestUserId, isPlusActive } from '@/lib/drizzle/server';
import { isHngrPlusEnabled } from '@/lib/plus';

export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    const user = await getDbUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isHngrPlusEnabled()) {
      return NextResponse.json({ isPlus: true });
    }

    return NextResponse.json({ isPlus: isPlusActive(user) });
  } catch (error: any) {
    console.error('Error checking hngr+ status:', error);
    return NextResponse.json({ error: error.message || 'Failed to check status' }, { status: 500 });
  }
}
