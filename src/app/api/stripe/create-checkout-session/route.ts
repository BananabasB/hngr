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

export async function POST(request: NextRequest) {
  try {
    if (!isHngrPlusEnabled()) {
      return NextResponse.json({ error: 'HNGR+ is disabled in this environment' }, { status: 403 });
    }

    const stripe = await getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userRows[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const plusActive =
      !!user.isPlus &&
      (!user.plusExpiresAt || new Date(user.plusExpiresAt) > new Date());

    if (plusActive) {
      return NextResponse.json(
        { error: 'You already have an active hngr+ membership' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'custom',
      adaptive_pricing: { enabled: true },
      payment_method_types: ['card'],
      metadata: {
        user_id: userId,
      },
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'hngr+',
            },
            unit_amount_decimal: '500',
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: `${process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000'}/pay/complete?session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({
      clientSecret: session.client_secret,
    });
  } catch (error: any) {
    console.error('error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'failed to create checkout session' },
      { status: 500 }
    );
  }
}
