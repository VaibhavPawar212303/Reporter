import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { organizationMembers, organizations, users } from '../../../../db/schema';

export async function POST(req: Request) {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 WEBHOOK RECEIVED AT:', new Date().toISOString());
  console.log('='.repeat(60));

  // Step 1: Check webhook secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  console.log('📋 Step 1: Checking WEBHOOK_SECRET');
  console.log('   - Secret exists:', !!WEBHOOK_SECRET);
  console.log('   - Secret starts with whsec_:', WEBHOOK_SECRET?.startsWith('whsec_'));
  console.log('   - Secret length:', WEBHOOK_SECRET?.length);

  if (!WEBHOOK_SECRET) {
    console.error('❌ CLERK_WEBHOOK_SECRET is not set');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Step 2: Get headers
  console.log('\n📋 Step 2: Getting headers');
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  console.log('   - svix-id:', svix_id ? '✅ Present' : '❌ Missing');
  console.log('   - svix-timestamp:', svix_timestamp ? '✅ Present' : '❌ Missing');
  console.log('   - svix-signature:', svix_signature ? '✅ Present' : '❌ Missing');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Missing svix headers');
    return new Response('Missing svix headers', { status: 400 });
  }

  // Step 3: Parse payload
  console.log('\n📋 Step 3: Parsing payload');
  const payload = await req.json();
  const body = JSON.stringify(payload);
  console.log('   - Payload type:', payload?.type);
  console.log('   - Payload data keys:', Object.keys(payload?.data || {}));

  // Step 4: Verify webhook
  console.log('\n📋 Step 4: Verifying webhook signature');
  let evt: WebhookEvent;

  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
    console.log('   ✅ Webhook signature verified successfully');
  } catch (err: any) {
    console.error('   ❌ Webhook verification failed:', err.message);
    return new Response(`Webhook verification failed: ${err.message}`, { status: 400 });
  }

  const eventType = evt.type;
  console.log('\n📋 Step 5: Processing event');
  console.log('   - Event type:', eventType);

  try {
    // Handle user.created
    if (eventType === 'user.created') {
      console.log('\n📋 Step 6: Creating user');
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses?.[0]?.email_address;

      console.log('   - User ID:', id);
      console.log('   - Email:', primaryEmail);
      console.log('   - First Name:', first_name);
      console.log('   - Last Name:', last_name);

      // Insert user
      console.log('\n📋 Step 6a: Inserting user into database');
      try {
        await db.insert(users).values({
          id,
          email: primaryEmail || '',
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
        });
        console.log('   ✅ User inserted successfully');
      } catch (userError: any) {
        console.error('   ❌ Failed to insert user:', userError.message);
        throw userError;
      }

      // Create organization
      const orgId = `org_${id}`;
      const slug = `workspace-${id.slice(-8)}`;
      const orgName = `${first_name || 'My'}'s Workspace`;

      console.log('\n📋 Step 6b: Creating organization');
      console.log('   - Org ID:', orgId);
      console.log('   - Org Name:', orgName);
      console.log('   - Slug:', slug);

      try {
        await db.insert(organizations).values({
          id: orgId,
          name: orgName,
          slug,
          ownerId: id,
        });
        console.log('   ✅ Organization created successfully');
      } catch (orgError: any) {
        console.error('   ❌ Failed to create organization:', orgError.message);
        throw orgError;
      }

      // Add organization member
      console.log('\n📋 Step 6c: Adding user as organization owner');
      try {
        await db.insert(organizationMembers).values({
          organizationId: orgId,
          userId: id,
          role: 'owner',
        });
        console.log('   ✅ Organization member added successfully');
      } catch (memberError: any) {
        console.error('   ❌ Failed to add organization member:', memberError.message);
        throw memberError;
      }

      console.log('\n' + '='.repeat(60));
      console.log('🎉 USER CREATED SUCCESSFULLY');
      console.log('   - User ID:', id);
      console.log('   - Organization ID:', orgId);
      console.log('='.repeat(60) + '\n');
    }

    // Handle user.updated
    if (eventType === 'user.updated') {
      console.log('\n📋 Step 6: Updating user');
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses?.[0]?.email_address;

      console.log('   - User ID:', id);
      console.log('   - New Email:', primaryEmail);
      console.log('   - New First Name:', first_name);

      try {
        await db
          .update(users)
          .set({
            email: primaryEmail || '',
            firstName: first_name || null,
            lastName: last_name || null,
            imageUrl: image_url || null,
          })
          .where(eq(users.id, id));
        console.log('   ✅ User updated successfully');
      } catch (updateError: any) {
        console.error('   ❌ Failed to update user:', updateError.message);
        throw updateError;
      }
    }

    // Handle user.deleted
    if (eventType === 'user.deleted') {
      console.log('\n📋 Step 6: Deleting user');
      const { id } = evt.data;
      console.log('   - User ID:', id);

      if (id) {
        try {
          await db.delete(users).where(eq(users.id, id));
          console.log('   ✅ User deleted successfully');
        } catch (deleteError: any) {
          console.error('   ❌ Failed to delete user:', deleteError.message);
          throw deleteError;
        }
      }
    }

    console.log('\n✅ WEBHOOK PROCESSED SUCCESSFULLY\n');
    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ DATABASE ERROR');
    console.error('='.repeat(60));
    console.error('   - Message:', error.message);
    console.error('   - Code:', error.code);
    console.error('   - Stack:', error.stack);
    console.error('='.repeat(60) + '\n');
    return new Response(`Database error: ${error.message}`, { status: 500 });
  }
}