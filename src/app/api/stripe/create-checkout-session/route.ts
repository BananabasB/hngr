import { NextRequest, NextResponse } from 'next/server';
import Stripe from "stripe";
import { createSupabaseServerClient } from '@/lib/supabase/server';

const stripeKey = process.env.STRIPE_KEY;
if (!stripeKey) {
  throw new Error('STRIPE_KEY environment variable is not set.');
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-11-17.clover"
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 500 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_plus, plus_expires_at')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('error fetching user for checkout:', userError);
      return NextResponse.json(
        { error: 'Unable to verify membership status' },
        { status: 500 }
      );
    }

    const plusActive =
      !!user?.is_plus &&
      (!user.plus_expires_at || new Date(user.plus_expires_at) > new Date());

    if (plusActive) {
      return NextResponse.json(
        { error: 'You already have an active hngr+ membership' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'custom',
      adaptive_pricing: {
        enabled: true,
      },
      payment_method_types: ['card'],
      metadata: {
        user_id: userId
      },
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'hngr+',
            },
            unit_amount_decimal: "500"
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: `${process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000'}/pay/complete?session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({
      clientSecret: session.client_secret
    });
  } catch (error: any) {
    console.error('error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'failed to create checkout session' },
      { status: 500 }
    );
  }
}