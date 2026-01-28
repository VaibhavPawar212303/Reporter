// src/app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { organizationMembers, organizations, users } from '../../../../db/schema';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('❌ CLERK_WEBHOOK_SECRET is not set');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Missing svix headers');
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err: any) {
    console.error('❌ Webhook verification failed:', err.message);
    return new Response(`Webhook verification failed: ${err.message}`, { status: 400 });
  }

  const eventType = evt.type;
  console.log(`✅ Webhook received: ${eventType}`);

  try {
    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses?.[0]?.email_address;

      await db.insert(users).values({
        id,
        email: primaryEmail || '',
        firstName: first_name || null,
        lastName: last_name || null,
        imageUrl: image_url || null,
      });

      const orgId = `org_${id}`;
      const slug = `workspace-${id.slice(-8)}`;

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

      console.log(`✅ Created user ${id} with organization ${orgId}`);
    }

    if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses?.[0]?.email_address;

      await db
        .update(users)
        .set({
          email: primaryEmail || '',
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
        })
        .where(eq(users.id, id));

      console.log(`✅ Updated user ${id}`);
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data;
      if (id) {
        await db.delete(users).where(eq(users.id, id));
        console.log(`✅ Deleted user ${id}`);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error: any) {
    console.error('❌ Database error:', error.message);
    return new Response(`Database error: ${error.message}`, { status: 500 });
  }
}