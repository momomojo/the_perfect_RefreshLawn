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

    // 3. Update Supabase Database
    try {
      // Update booking status to 'payment_refunded'
      const { data: booking, error: bookingFetchError } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('stripe_payment_intent_id', payment_intent_id)
        .single();

      if (bookingFetchError) {
        console.error("Error fetching booking for refund update:", bookingFetchError);
        throw new Error(`Failed to find booking for payment intent ${payment_intent_id}`);
      }

      if (!booking) {
        console.warn(`No booking found for payment intent ${payment_intent_id}`);
      } else {
        // Update booking status
        const { error: bookingUpdateError } = await supabaseAdmin
          .from('bookings')
          .update({
            status: 'payment_refunded',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (bookingUpdateError) {
          console.error("Error updating booking status after refund:", bookingUpdateError);
          throw bookingUpdateError;
        }

        console.log(`Booking ${booking.id} status updated to 'payment_refunded'`);

        // Check if there's a related refund_request and update it
        const { data: refundRequest, error: refundRequestFetchError } = await supabaseAdmin
          .from('refund_requests')
          .select('id, status')
          .eq('booking_id', booking.id)
          .maybeSingle();

        if (refundRequestFetchError) {
          console.error("Error fetching refund request:", refundRequestFetchError);
          // Don't throw - this is optional
        }

        if (refundRequest && refundRequest.status === 'pending') {
          // Update refund_request to approved if it was pending
          const { error: refundRequestUpdateError } = await supabaseAdmin
            .from('refund_requests')
            .update({
              status: 'approved',
              approved_amount: refundAmount ? (refundAmount / 100) : refund.amount / 100, // Convert cents to dollars
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', refundRequest.id);

          if (refundRequestUpdateError) {
            console.error("Error updating refund request status:", refundRequestUpdateError);
            // Don't throw - booking update succeeded, this is secondary
          } else {
            console.log(`Refund request ${refundRequest.id} status updated to 'approved'`);
          }
        }
      }
    } catch (dbError) {
      console.error("Database update error after refund:", dbError);
      // Refund succeeded in Stripe, but DB update failed
      // Return success but log the database error
      const dbErrorMessage = dbError instanceof Error ? dbError.message : "Unknown database error";
      console.warn(`Stripe refund ${refund.id} succeeded but database update failed: ${dbErrorMessage}`);
      // Continue to return success since the refund itself worked
    }

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
