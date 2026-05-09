import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { userRepository } from '@/repositories/drizzle/user.repository';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET');
    return new Response('Error occured -- no webhook secret', {
      status: 500
    });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url, username } = evt.data;
    
    // Clerk provides first_name/last_name, but we use displayName in our schema
    const email = email_addresses?.[0]?.email_address;
    const displayName = [first_name, last_name].filter(Boolean).join(' ') || username || null;

    if (!id || !email) {
      console.error('Webhook error: Missing id or email in payload');
      return new Response('Missing id or email', { status: 400 });
    }

    try {
      await userRepository.syncUser({
        id,
        email,
        username: username || null,
        displayName,
        avatarUrl: image_url || null,
      });
      console.log(`User ${id} synced via webhook (${eventType})`);
    } catch (error) {
      console.error(`Error syncing user ${id} via webhook:`, error);
      return new Response('Error syncing user', { status: 500 });
    }
  }

  return new Response('Webhook processed', { status: 200 });
}
