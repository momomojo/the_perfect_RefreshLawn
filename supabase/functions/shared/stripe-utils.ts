/**
 * Stripe Utilities for Supabase Edge Functions
 *
 * Provides Stripe client initialization and customer management.
 * This is the CANONICAL source - all Edge Functions should import from here.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from 'https://esm.sh/stripe@12.4.0?dts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

// Validate critical environment variables
if (!stripeSecretKey) {
  console.error('[Stripe] CRITICAL: STRIPE_SECRET_KEY is not set!');
}
if (!supabaseUrl) {
  console.error('[Stripe] CRITICAL: SUPABASE_URL is not set!');
}
if (!supabaseServiceKey) {
  console.error('[Stripe] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set!');
}

/**
 * Stripe client instance - configured with latest API version
 */
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

/**
 * Get Supabase client with service role key
 */
export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Get Stripe customer ID from the database
 * @param userId - Supabase user ID
 * @returns Stripe customer ID
 * @throws Error if customer not found
 */
export async function getStripeCustomerId(userId: string): Promise<string> {
  const supabase = getSupabaseClient();

  // Check in customers table
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (customerError) {
    console.error('[Stripe] Error fetching customer:', customerError.message);
    throw new Error('Failed to retrieve customer information.');
  }

  if (customerData?.stripe_customer_id) {
    return customerData.stripe_customer_id;
  }

  throw new Error('Stripe customer ID not found for this user.');
}

/**
 * Get or create Stripe customer, ensuring local DB and Stripe are consistent
 * @param user - Supabase user object
 * @param supabase - Supabase client instance
 * @returns Stripe customer ID
 */
export async function getOrCreateStripeCustomer(
  user: { id: string; email?: string },
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<string> {
  // Fetch user profile data from Supabase
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('[Stripe] Error fetching profile:', profileError.message);
    throw new Error(
      'Could not fetch user profile for Stripe customer handling.'
    );
  }

  // Construct customer details from profile or fallbacks
  const customerName =
    profileData?.first_name && profileData?.last_name
      ? `${profileData.first_name} ${profileData.last_name}`
      : null;
  const customerEmail = user.email;
  const customerPhone = profileData?.phone || null;

  // Check local 'customers' table
  const { data: customerRecord, error: customerDbError } = await supabase
    .from('customers')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (customerDbError) {
    console.error(
      '[Stripe] Error checking customer record:',
      customerDbError.message
    );
    throw customerDbError;
  }

  let customerId: string;

  if (customerRecord?.stripe_customer_id) {
    // Customer exists - Update Stripe customer and local DB record
    customerId = customerRecord.stripe_customer_id;
    console.log(`[Stripe] Existing customer found: ${customerId}, updating...`);

    try {
      await stripe.customers.update(customerId, {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      });

      // Update local 'customers' table
      await supabase
        .from('customers')
        .update({
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      console.log(`[Stripe] Customer ${customerId} updated successfully.`);
    } catch (updateError) {
      console.error(
        `[Stripe] Error updating customer ${customerId}:`,
        updateError
      );
      // Log and continue with existing customerId
    }
  } else {
    // Customer doesn't exist - Create in Stripe and insert into local DB
    console.log('[Stripe] No Stripe customer found, creating new one...');

    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      phone: customerPhone,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    customerId = customer.id;
    console.log(`[Stripe] New customer created: ${customerId}`);

    // Insert into local 'customers' table
    const { error: insertError } = await supabase.from('customers').insert({
      user_id: user.id,
      stripe_customer_id: customerId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error(
        '[Stripe] Error inserting customer record:',
        insertError.message
      );
      throw new Error('Failed to save new Stripe customer ID to database.');
    }
  }

  return customerId;
}

/**
 * Format amount for Stripe (convert dollars to cents)
 * @param amount - Amount in dollars
 * @returns Amount in cents
 */
export function formatStripeAmount(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Format amount from Stripe (convert cents to dollars)
 * @param amount - Amount in cents
 * @returns Amount in dollars
 */
export function parseStripeAmount(amount: number): number {
  return amount / 100;
}
