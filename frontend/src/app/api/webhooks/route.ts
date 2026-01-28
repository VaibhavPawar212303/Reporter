// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { organizationMembers, organizations, users } from '../../../../db/schema';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const eventType = evt.type;

  // Handle user events
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const primaryEmail = email_addresses?.[0]?.email_address;

    await db
      .insert(users)
      .values({
        id,
        email: primaryEmail || '',
        firstName: first_name || null,
        lastName: last_name || null,
        imageUrl: image_url || null,
      })
      .onDuplicateKeyUpdate({
        set: {
          email: primaryEmail || '',
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
        },
      });

    // Create default organization for new users
    if (eventType === 'user.created') {
      const orgId = `org_${id}`;
      const slug = `${first_name?.toLowerCase() || 'user'}-${id.slice(-6)}`;

      await db.insert(organizations).values({
        id: orgId,
        name: `${first_name || 'My'}'s Workspace`,
        slug,
        ownerId: id,
      });

      await db.insert(organizationMembers).values({
        organizationId: orgId,
        userId: id,
        role: 'owner',
      });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    if (id) {
      await db.delete(users).where(eq(users.id, id));
    }
  }

  return new Response('OK', { status: 200 });
}