// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, createErrorResponse, createSuccessResponse, handleCorsPreflightRequest, parseRequestBody } from "../shared/http-utils.ts";
import { stripe, getSupabaseClient, getOrCreateStripeCustomer } from "../shared/stripe-utils.ts";
import { verifyUser } from "../shared/auth-utils.ts";
// Helper function to create a payment intent
async function handleCreatePaymentIntent(user, body, headers) {
  const { amount, currency = "usd", paymentMethodId, serviceId, bookingPrice, scheduledDate, scheduledTime, address, notes, propertySize, areaType } = body;
  const supabase = getSupabaseClient(); // Get Supabase client instance
  try {
    // 1. Get or create Stripe customer ID using the shared function
    const customerId = await getOrCreateStripeCustomer(user, supabase);
    // 2. Create an Ephemeral Key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create({
      customer: customerId
    }, {
      apiVersion: "2024-06-20"
    });
    console.log(`Ephemeral key created for customer: ${customerId}`);
    // 3. Create the PaymentIntent
    const paymentIntentParams = {
      amount,
      currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true
      },
      // If a specific payment method ID is provided (e.g., saved card),
      // set it directly and auto-confirm it
      ...paymentMethodId && {
        payment_method: paymentMethodId,
        confirm: true, // Auto-confirm when using saved payment method
        off_session: true, // Indicate this is saved card being charged
      },
      // Add setup_future_usage if applicable, e.g., for saving cards during checkout
      // setup_future_usage: 'on_session', // Example
      metadata: {
        supabase_user_id: user.id,
        service_id: serviceId,
        booking_price: bookingPrice.toString(),
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        ...address && {
          address
        },
        ...notes && {
          notes
        },
        ...propertySize && {
          property_size: propertySize
        },
        ...areaType && {
          area_type: areaType
        }
      }
    };
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    console.log(`PaymentIntent ${paymentIntent.id} created for customer: ${customerId}${paymentMethodId ? ' (auto-confirmed with saved card)' : ''}`);
    // 4. Retrieve publishable key from environment variables
    // Ensure this is the *client-side* publishable key
    const publishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY");
    if (!publishableKey) {
      throw new Error("Stripe publishable key not found in environment.");
    }
    // 5. Return necessary details to the client
    return createSuccessResponse({
      paymentIntentClientSecret: paymentIntent.client_secret,
      ephemeralKeySecret: ephemeralKey.secret,
      customerId: customerId,
      publishableKey: publishableKey
    }, headers);
  } catch (error) {
    console.error("Error in handleCreatePaymentIntent:", error);
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to create payment intent: ${message}`, 500, headers);
  }
}
// Handler to fetch receipt URL for a given PaymentIntent
async function handleGetReceiptUrl(user, body, headers) {
  const { paymentIntentId } = body;
  console.log(`[handleGetReceiptUrl] Fetching receipt for PaymentIntent: ${paymentIntentId}`);

  try {
    // Expand latest_charge to get the most recent charge with receipt_url
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"]
    });

    console.log(`[handleGetReceiptUrl] PaymentIntent status: ${paymentIntent.status}, has latest_charge: ${!!paymentIntent.latest_charge}`);

    const charge = paymentIntent.latest_charge;
    const receiptUrl = charge?.receipt_url;

    console.log(`[handleGetReceiptUrl] Receipt URL found: ${!!receiptUrl}`);

    if (!receiptUrl) {
      console.error(`[handleGetReceiptUrl] No receipt URL available for PaymentIntent ${paymentIntentId}`);
      return createErrorResponse("Receipt URL not found", 404, headers);
    }

    console.log(`[handleGetReceiptUrl] Successfully retrieved receipt URL`);
    return createSuccessResponse({
      receiptUrl
    }, headers);
  } catch (error) {
    console.error(`[handleGetReceiptUrl] Error retrieving receipt:`, error);
    const msg = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Failed to retrieve receipt: ${msg}`, 500, headers);
  }
}
// Main function handler
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest();
  }
  // Only allow POST requests
  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405, corsHeaders);
  }
  try {
    // Parse the request body FIRST to get the routing path and payload
    const body = await parseRequestBody(req);
    console.log("Received body:", JSON.stringify(body));
    const routePath = body.path; // Get path from body
    const payload = body.payload || {}; // Get payload from body
    console.log(`Extracted routePath: "${routePath}", payload:`, JSON.stringify(payload));
    // Verify the user
    const user = await verifyUser(req);
    if (!user) {
      return createErrorResponse("Unauthorized", 401, corsHeaders);
    }
    console.log(`stripe-payment-api called: path=${routePath}, user=${user.id}`);
    // Route the request based on the path from the body
    switch(routePath){
      case "create-payment-intent":
        return await handleCreatePaymentIntent(user, payload, corsHeaders);
      case "get-receipt-url":
        return await handleGetReceiptUrl(user, payload, corsHeaders);
      default:
        console.error(`Unknown path received: "${routePath}"`);
        return createErrorResponse(`Invalid path: "${routePath}" (received ${typeof routePath})`, 404, corsHeaders);
    }
  } catch (error) {
    console.error("Error in main function handler:", error);
    return createErrorResponse(error.message, 500, corsHeaders);
  }
}); /* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stripe-payment-api' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"path":"create-payment-intent", "payload":{"amount":1000, "currency":"usd"}}'

*/ 
