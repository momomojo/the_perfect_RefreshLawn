// Stripe Utils
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@12.4.0?dts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

// Create and export a Stripe instance
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

// Helper to get a Supabase client
export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Get Stripe customer ID from the database
export async function getStripeCustomerId(userId: string): Promise<string> {
  const supabase = getSupabaseClient();

  // First check in customers table
  const { data: customerData, error: customerError } = await supabase
    .from("customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (customerError) {
    console.error("Error fetching customer:", customerError);
    throw new Error("Failed to retrieve customer information.");
  }

  if (customerData?.stripe_customer_id) {
    return customerData.stripe_customer_id;
  }

  throw new Error("Stripe customer ID not found for this user.");
}

// Get or create Stripe customer ID, ensuring local DB and Stripe are consistent
export async function getOrCreateStripeCustomer(
  user: User,
  supabase: SupabaseClient<any, "public", any> // Pass Supabase client
): Promise<string> {
  // 1. Fetch user profile data from Supabase
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Error fetching profile:", profileError);
    throw new Error("Could not fetch user profile for Stripe customer handling.");
  }

  // Construct customer details from profile or fallbacks
  const customerName =
    profileData?.first_name && profileData?.last_name
      ? `${profileData.first_name} ${profileData.last_name}`
      : null;
  const customerEmail = user.email;
  const customerPhone = profileData?.phone || null;

  // 2. Check local 'customers' table
  const { data: customerRecord, error: customerDbError } = await supabase
    .from("customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (customerDbError) throw customerDbError;

  let customerId: string;

  if (customerRecord?.stripe_customer_id) {
    // 3a. Customer exists - Update Stripe customer and local DB record
    customerId = customerRecord.stripe_customer_id;
    console.log(`Existing Stripe customer found: ${customerId}, updating...`);

    try {
      await stripe.customers.update(customerId, {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      });
      // Update local 'customers' table (ensure consistency)
      await supabase
        .from("customers")
        .update({
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      console.log(`Stripe customer ${customerId} updated successfully.`);
    } catch (updateError) {
      console.error(`Error updating Stripe customer ${customerId}:`, updateError);
      // Decide if this should be a fatal error or just logged
      // For now, we'll log and continue, using the existing customerId
    }
  } else {
    // 3b. Customer doesn't exist - Create in Stripe and insert into local DB
    console.log("No Stripe customer found, creating new one...");
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      phone: customerPhone,
      metadata: {
        supabase_user_id: user.id,
      },
    });
    customerId = customer.id;
    console.log(`New Stripe customer created: ${customerId}`);

    // Insert into local 'customers' table
    const { error: insertError } = await supabase.from("customers").insert({
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
        "Error inserting new customer record into Supabase:",
        insertError
      );
      // This is more critical, potentially throw error or handle cleanup
      throw new Error("Failed to save new Stripe customer ID to database.");
    }
  }

  return customerId;
}
