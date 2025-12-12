import { NextRequest, NextResponse } from 'next/server';
import Stripe from "stripe";

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