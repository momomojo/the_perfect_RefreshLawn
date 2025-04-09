// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@12.4.0?dts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Add the new error formatting utility function
function formatErrorResponse(
  error: any,
  operation: string,
  defaultStatus: number = 400 // Default to 400 for webhook errors
): Response {
  console.error(`Error during ${operation}:`, error);

  let statusCode = defaultStatus;
  let message = "An unexpected error occurred";
  let code = "unknown_error";

  // Check for Stripe signature verification errors specifically
  if (
    error instanceof Stripe.errors.StripeSignatureVerificationError ||
    (error instanceof Error && error.message.includes("signature"))
  ) {
    statusCode = 400;
    message = "Webhook signature verification failed";
    code = "stripe_signature_verification_error";
  } else if (error instanceof Stripe.errors.StripeError) {
    statusCode = error.statusCode || 500;
    message = error.message;
    code = error.code || "stripe_error";
  } else if (error instanceof Error) {
    message = error.message;
  }

  // Base headers
  const headers = {
    "Content-Type": "application/json",
    Allow: "POST", // Indicate allowed method for 405
  };

  return new Response(
    JSON.stringify({
      error: message,
      code: code,
      operation,
    }),
    {
      headers,
      status: statusCode,
    }
  );
}

serve(async (req) => {
  // CORS for preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      status: 204,
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    // Get the signature from the headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      // Use formatErrorResponse for missing signature
      return formatErrorResponse(
        new Error("No signature provided"),
        "webhook_signature_check"
      );
    }

    // Get the raw request body
    const body = await req.text();

    // Verify the webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret
    );

    // Handle the event
    console.log(`Event type: ${event.type}`);

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "customer.updated":
        await handleCustomerUpdated(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Use the new utility in the main catch block
    return formatErrorResponse(error, "webhook_event_handling");
  }
});

// Event handlers
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  console.log("Payment intent succeeded:", paymentIntent.id);

  // Extract customer data
  const supabaseUserId = paymentIntent.metadata?.supabase_user_id;
  if (!supabaseUserId) {
    console.log("No user ID in metadata, skipping update");
    return;
  }

  // Update payment records in database
  await supabase.from("payments").insert({
    user_id: supabaseUserId,
    stripe_payment_id: paymentIntent.id,
    stripe_customer_id: paymentIntent.customer as string,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: paymentIntent.status,
    payment_method: paymentIntent.payment_method as string,
    created_at: new Date().toISOString(),
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("Payment intent failed:", paymentIntent.id);

  const supabaseUserId = paymentIntent.metadata?.supabase_user_id;
  if (!supabaseUserId) {
    console.log("No user ID in metadata, skipping update");
    return;
  }

  // Log the failed payment
  await supabase.from("payments").insert({
    user_id: supabaseUserId,
    stripe_payment_id: paymentIntent.id,
    stripe_customer_id: paymentIntent.customer as string,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: paymentIntent.status,
    payment_method: paymentIntent.payment_method as string,
    error_message: paymentIntent.last_payment_error?.message,
    created_at: new Date().toISOString(),
  });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("Subscription created:", subscription.id);

  const supabaseUserId = subscription.metadata?.supabase_user_id;
  if (!supabaseUserId) {
    // Try to find user ID via customer
    const { data, error } = await supabase
      .from("customers")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer)
      .single();

    if (error || !data) {
      console.log("Could not find user for customer, skipping update");
      return;
    }

    // Update subscription record
    await supabase.from("subscriptions").insert({
      user_id: data.user_id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      price_id: subscription.items.data[0]?.price.id || "",
      current_period_start: new Date(
        subscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      created_at: new Date().toISOString(),
    });
  } else {
    // Update subscription record
    await supabase.from("subscriptions").insert({
      user_id: supabaseUserId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      price_id: subscription.items.data[0]?.price.id || "",
      current_period_start: new Date(
        subscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      created_at: new Date().toISOString(),
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("Subscription updated:", subscription.id);

  // Update subscription status in database
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      price_id: subscription.items.data[0]?.price.id || "",
      current_period_start: new Date(
        subscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error updating subscription:", error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("Subscription deleted:", subscription.id);

  // Update subscription status to canceled
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error marking subscription as canceled:", error);
  }
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  console.log("Customer updated:", customer.id);

  // Update customer info in database
  const { error } = await supabase
    .from("customers")
    .update({
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customer.id);

  if (error) {
    console.error("Error updating customer:", error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("Invoice payment succeeded:", invoice.id);

  // Record successful invoice payment
  await supabase.from("invoices").insert({
    stripe_invoice_id: invoice.id,
    stripe_customer_id: invoice.customer as string,
    stripe_subscription_id: invoice.subscription as string,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status,
    invoice_pdf: invoice.invoice_pdf,
    created_at: new Date().toISOString(),
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("Invoice payment failed:", invoice.id);

  // Record failed invoice payment
  await supabase.from("invoices").insert({
    stripe_invoice_id: invoice.id,
    stripe_customer_id: invoice.customer as string,
    stripe_subscription_id: invoice.subscription as string,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status,
    created_at: new Date().toISOString(),
  });

  // Optionally: Notify customer about payment failure
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stripe-webhook' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
