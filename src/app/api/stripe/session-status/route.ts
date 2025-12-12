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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "customer"],
    }) as Stripe.Checkout.Session & { 
      payment_intent: Stripe.PaymentIntent;
      customer?: Stripe.Customer;
    };

    // If payment is complete, grant hngr+ status
    if (session.status === 'complete' && session.payment_status === 'paid') {
      // Get user ID from session metadata or customer email
      let userId = session.metadata?.user_id;
      
      if (!userId && session.customer) {
        // Try to find user by customer email
        const customer = session.customer as Stripe.Customer;
        if (customer.email) {
          const supabase = createSupabaseServerClient();
          if (supabase) {
            const { data: user } = await supabase
              .from('users')
              .select('id')
              .eq('email', customer.email)
              .single();
            
            userId = user?.id;
          }
        }
      }

      if (userId) {
        const supabase = createSupabaseServerClient();
        if (supabase) {
          // Grant hngr+ status (1 year from now)
          const plusExpiresAt = new Date();
          plusExpiresAt.setFullYear(plusExpiresAt.getFullYear() + 1);
          
          await supabase
            .from('users')
            .update({
              is_plus: true,
              plus_expires_at: plusExpiresAt.toISOString()
            })
            .eq('id', userId);
        }
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
