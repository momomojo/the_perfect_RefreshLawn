import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts"; // Updated import path

console.log("Stripe Refund function starting up...");

const stripe = Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  // Added ! for non-null assertion
  // @ts-ignore NOTE: Deno read-only FS requires specifying a Cache instance
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: "2022-11-15",
});

// Initialize Supabase client if you need to update your DB
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!, // Added ! for non-null assertion
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Added ! for non-null assertion
);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders }); // Use imported headers
  }

  try {
    // 1. Validate request body
    const { payment_intent_id, amount } = await req.json();
    if (!payment_intent_id) {
      throw new Error("Missing required parameter: payment_intent_id");
    }

    // Amount is optional in Stripe API (defaults to full amount if omitted)
    // Ensure amount, if provided, is an integer (cents)
    const refundAmount = amount ? Math.round(Number(amount)) : undefined;
    if (amount && (isNaN(refundAmount) || refundAmount <= 0)) {
      throw new Error("Invalid amount provided. Must be a positive number.");
    }

    console.log(
      `Processing refund for PI: ${payment_intent_id}, Amount: ${
        refundAmount || "Full"
      }`
    );

    // 2. Create refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment_intent_id,
      amount: refundAmount,
    });

    console.log("Stripe refund successful:", refund.id);

    // 3. (Optional but Recommended) Update your Supabase Database
    // Example: Update booking status and/or payment record
    /*
    const { error: updateError } = await supabaseAdmin
      .from('bookings') // Or your payments table
      .update({ status: 'refunded' }) // Or payment_status
      .eq('stripe_payment_intent_id', payment_intent_id);

    if (updateError) {
      console.error("Error updating database after refund:", updateError);
      // Decide if this should cause the function to fail overall
    }
    */

    // 4. Return success response
    return new Response(
      JSON.stringify({
        refundId: refund.id,
        status: refund.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing refund:", error);
    // Ensure error.message is used, default to a generic message if needed
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unknown error occurred during refund processing.";
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400, // Use 400 for client-side errors or 500 for server-side
      }
    );
  }
});

// To run locally:
// 1. Set environment variables: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// 2. supabase functions serve stripe-refund --no-verify-jwt --env-file ./supabase/.env.local
//
// To deploy:
// 1. Set secrets: supabase secrets set STRIPE_SECRET_KEY=sk_... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
// 2. supabase functions deploy stripe-refund --no-verify-jwt
