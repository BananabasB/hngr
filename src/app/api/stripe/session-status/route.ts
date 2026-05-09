import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isHngrPlusEnabled } from '@/lib/plus';

const stripeKey = process.env.STRIPE_KEY;

async function getStripe() {
  if (!stripeKey) return null;
  const { default: Stripe } = await import('stripe');
  return new Stripe(stripeKey, { apiVersion: '2025-11-17.clover' });
}

export async function GET(request: NextRequest) {
  try {
    if (!isHngrPlusEnabled()) {
      return NextResponse.json({ status: 'complete', payment_status: 'paid', payment_intent_id: '', payment_intent_status: 'succeeded' });
    }

    const stripe = await getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    }) as any;

    if (session.status === 'complete' && session.payment_status === 'paid') {
      let userId = session.metadata?.user_id ?? null;

      if (!userId && session.customer && typeof session.customer !== 'string') {
        const customer = session.customer as any;
        if (customer.email) {
          const user = await db.select({ id: users.id }).from(users).where(eq(users.email, customer.email)).limit(1);
          userId = user[0]?.id ?? null;
        }
      }

      if (userId) {
        const plusExpiresAt = new Date();
        plusExpiresAt.setFullYear(plusExpiresAt.getFullYear() + 1);

        await db
          .update(users)
          .set({
            isPlus: true,
            plusExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }
    }

    return NextResponse.json({
      status: session.status,
      payment_status: session.payment_status,
      payment_intent_id: session.payment_intent.id,
      payment_intent_status: session.payment_intent.status,
    });
  } catch (error: any) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}
