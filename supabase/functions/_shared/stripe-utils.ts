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
