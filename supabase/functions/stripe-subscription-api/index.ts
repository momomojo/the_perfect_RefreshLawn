// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { User } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@12.4.0?dts";
import {
  corsHeaders,
  createErrorResponse,
  createSuccessResponse,
  handleCorsPreflightRequest,
  ResponseHeaders,
  parseRequestBody,
} from "../shared/http-utils.ts";
import {
  getStripeCustomerId,
  stripe,
  getSupabaseClient,
} from "../shared/stripe-utils.ts";
import { verifyUser } from "../shared/auth-utils.ts";

// Define interface types
interface SubscriptionRequest {
  priceId: string;
  paymentMethodId: string;
}

interface CancelSubscriptionRequest {
  subscriptionId: string;
}

interface ListInvoicesRequest {
  limit?: number;
  starting_after?: string;
  customer?: string; // Allow filtering by Stripe Customer ID
}

// Helper function to create a subscription
async function handleCreateSubscription(
  user: User,
  body: SubscriptionRequest,
  headers: ResponseHeaders
) {
  const { priceId, paymentMethodId } = body;
  const supabase = getSupabaseClient();

  try {
    // Get the customer ID
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError || !customer?.stripe_customer_id) {
      throw new Error("Customer not found. Please create a customer first.");
    }

    // Attach payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.stripe_customer_id,
    });

    // Set as default payment method
    await stripe.customers.update(customer.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.stripe_customer_id,
      items: [{ price: priceId }],
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        supabase_user_id: user.id,
      },
    });

    // Store subscription in database
    await supabase.from("subscriptions").insert({
      user_id: user.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customer.stripe_customer_id,
      status: subscription.status,
      price_id: priceId,
      created_at: new Date().toISOString(),
    });

    return createSuccessResponse(
      {
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret:
          subscription.latest_invoice?.payment_intent?.client_secret,
      },
      headers
    );
  } catch (error) {
    console.error("Error creating subscription:", error);
    return createErrorResponse((error as Error).message, 400, headers);
  }
}

// Helper function to cancel a subscription
async function handleCancelSubscription(
  user: User,
  body: CancelSubscriptionRequest,
  headers: ResponseHeaders
) {
  const { subscriptionId } = body;
  try {
    // Verify the subscription belongs to the user (optional but recommended)
    const customerId = await getStripeCustomerId(user.id);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // @ts-ignore - TypeScript might complain about comparing string vs object
    if (subscription.customer !== customerId) {
      throw new Error("Subscription does not belong to this user.");
    }

    // Cancel the subscription immediately
    const deletedSubscription = await stripe.subscriptions.del(subscriptionId);

    // Update local database status via webhook handler (preferred)
    // Or update directly here if immediate confirmation is needed:
    // await supabase
    //   .from("subscriptions")
    //   .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    //   .eq("stripe_subscription_id", subscriptionId);

    return createSuccessResponse(deletedSubscription, headers);
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return createErrorResponse((error as Error).message, 400, headers);
  }
}

// Handle listing invoices for a specific customer
async function handleListInvoices(
  user: User,
  body: ListInvoicesRequest,
  headers: ResponseHeaders
) {
  const { limit = 10, starting_after, customer } = body;
  try {
    const customerId = customer ?? (await getStripeCustomerId(user.id));

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
      starting_after: starting_after || undefined,
    });

    return createSuccessResponse(invoices, headers);
  } catch (error) {
    console.error("Error listing invoices:", error);
    return createErrorResponse((error as Error).message, 400, headers);
  }
}

// Main function handler
serve(async (req) => {
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
    const routePath = body.path; // Get path from body
    const payload = body.payload || {}; // Get payload from body

    // Verify the user
    const user = await verifyUser(req);
    if (!user) {
      return createErrorResponse("Unauthorized", 401, corsHeaders);
    }

    console.log(
      `stripe-subscription-api called: path=${routePath}, user=${user.id}`
    );

    // Route the request based on the path from the body
    switch (routePath) {
      case "create-subscription":
        return await handleCreateSubscription(
          user,
          payload as SubscriptionRequest,
          corsHeaders
        );
      case "cancel-subscription":
        return await handleCancelSubscription(
          user,
          payload as CancelSubscriptionRequest,
          corsHeaders
        );
      case "list-invoices":
        return await handleListInvoices(
          user,
          payload as ListInvoicesRequest,
          corsHeaders
        );
      default:
        return createErrorResponse("Invalid path", 404, corsHeaders);
    }
  } catch (error) {
    console.error("Error in main function handler:", error);
    return createErrorResponse((error as Error).message, 500, corsHeaders);
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stripe-subscription-api' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"path":"list-invoices", "payload":{"limit":5}}'

*/
