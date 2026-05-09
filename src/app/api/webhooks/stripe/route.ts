import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

const stripeKey = process.env.STRIPE_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function getStripe() {
  if (!stripeKey) return null;
  const { default: Stripe } = await import('stripe');
  return new Stripe(stripeKey, { apiVersion: '2025-11-17.clover' });
}

export async function POST(req: NextRequest) {
  if (!stripeKey || !webhookSecret) {
    console.error('Missing Stripe environment variables');
    return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 });
  }

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;

  let event: any;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const userId = session.metadata?.user_id;

      if (userId) {
        // Grant hngr+ status for 1 month
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await db.update(users)
          .set({
            isPlus: true,
            plusExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        console.log(`hngr+ granted to user ${userId} via Stripe webhook`);
      }
    }
  } catch (dbError) {
    console.error('Error updating user from Stripe webhook:', dbError);
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
