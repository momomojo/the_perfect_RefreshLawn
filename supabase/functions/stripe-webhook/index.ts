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
  apiVersion: "2024-06-20",
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      return new Response(JSON.stringify({ error: "No signature provided" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Log webhook details for debugging
    console.log("Webhook signature:", signature);

    // Get the raw request body
    const body = await req.text();

    // Log body length for debugging
    console.log("Request body length:", body.length);

    // Use the async version of the webhook signature verification
    let event;
    try {
      // This approach uses the built-in Web Crypto API in Deno
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Webhook signature verification failed: ${errorMessage}`);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${errorMessage}` }),
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Handle the event
    console.log(`Event type: ${event.type}`);

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "charge.succeeded":
        console.log(
          `Charge succeeded: ${event.data.object.id}, for payment intent: ${event.data.object.payment_intent}`
        );
        // No need to process as we handle payment_intent.succeeded
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.updated":
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error handling webhook:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
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
  await supabase.from("payments").upsert(
    {
      user_id: supabaseUserId,
      booking_id: paymentIntent.metadata?.booking_id,
      stripe_payment_id: paymentIntent.id,
      stripe_customer_id: paymentIntent.customer as string,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      payment_method: paymentIntent.payment_method_types?.join(","),
      created_at: new Date().toISOString(),
    },
    { onConflict: "stripe_payment_id" }
  );

  // Update booking status to payment_confirmed if booking_id is in metadata
  if (paymentIntent.metadata?.booking_id) {
    console.log("Updating booking status to payment_confirmed");

    // Option 1: Use the new database function
    const { data, error } = await supabase.rpc(
      "update_booking_status_for_payment",
      {
        payment_intent_id: paymentIntent.id,
        new_status: "payment_confirmed",
      }
    );

    if (error) {
      console.error("Error updating booking status with RPC:", error);

      // Option 2: Fall back to direct update via bookings table
      const { error: directError } = await supabase
        .from("bookings")
        .update({ status: "payment_confirmed" })
        .eq("stripe_payment_intent_id", paymentIntent.id);

      if (directError) {
        console.error("Error directly updating booking status:", directError);
      }
    } else {
      console.log("Successfully updated booking status to payment_confirmed");
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("Payment intent failed:", paymentIntent.id);

  const supabaseUserId = paymentIntent.metadata?.supabase_user_id;
  if (!supabaseUserId) {
    console.log("No user ID in metadata, skipping update");
    return;
  }

  // Log the failed payment
  await supabase.from("payments").upsert(
    {
      user_id: supabaseUserId,
      booking_id: paymentIntent.metadata?.booking_id,
      stripe_payment_id: paymentIntent.id,
      stripe_customer_id: paymentIntent.customer as string,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      payment_method: paymentIntent.payment_method_types?.join(","),
      error_message: paymentIntent.last_payment_error?.message,
      created_at: new Date().toISOString(),
    },
    { onConflict: "stripe_payment_id" }
  );

  // Update booking status to payment_failed if booking_id is in metadata
  if (paymentIntent.metadata?.booking_id) {
    console.log("Updating booking status to payment_failed");

    // Option 1: Use the new database function
    const { data, error } = await supabase.rpc(
      "update_booking_status_for_payment",
      {
        payment_intent_id: paymentIntent.id,
        new_status: "payment_failed",
      }
    );

    if (error) {
      console.error("Error updating booking status with RPC:", error);

      // Option 2: Fall back to direct update via bookings table
      const { error: directError } = await supabase
        .from("bookings")
        .update({ status: "payment_failed" })
        .eq("stripe_payment_intent_id", paymentIntent.id);

      if (directError) {
        console.error("Error directly updating booking status:", directError);
      }
    } else {
      console.log("Successfully updated booking status to payment_failed");
    }
  }
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
    await supabase.from("subscriptions").upsert(
      {
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
        canceled_at: subscription.canceled_at,
        created_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" }
    );
  } else {
    // Update subscription record
    await supabase.from("subscriptions").upsert(
      {
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
        canceled_at: subscription.canceled_at,
        created_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" }
    );
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
  console.log("Handling Customer Updated:", customer.id);

  // We need the Stripe Customer ID to find the record in our DB.
  const stripeCustomerId = customer.id;

  try {
    const { data, error } = await supabase
      .from("customers")
      .update({
        // Update fields based on the webhook payload
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        updated_at: new Date().toISOString(), // Use current time for update timestamp
      })
      .eq("stripe_customer_id", stripeCustomerId) // Match using Stripe ID
      .select(); // Select the updated record(s) to confirm

    if (error) {
      console.error(
        `Error updating customer record for Stripe ID ${stripeCustomerId}:`,
        error
      );
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn(
        `No customer record found in DB to update for Stripe ID ${stripeCustomerId}. Maybe created directly in Stripe without metadata?`
      );
      // Optionally: Could attempt to insert here if user_id is available in metadata,
      // but be cautious about creating potentially unwanted records.
    } else {
      console.log(
        `Successfully updated customer record(s) for Stripe ID ${stripeCustomerId}. Count: ${data.length}`
      );
    }

    // **Optional**: Sync back to profiles table?
    const supabaseUserId = customer.metadata?.supabase_user_id;
    if (supabaseUserId) {
      console.log(`Also updating profile for user ${supabaseUserId}`);
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          email: customer.email,
          phone: customer.phone,
          // Optionally split name if needed:
          ...(customer.name
            ? (() => {
                const [first_name, ...rest] = customer.name.split(' ');
                return {
                  first_name,
                  last_name: rest.join(' ') || null,
                };
              })()
            : {}),
        })
        .eq('id', supabaseUserId);
      if (profileUpdateError) {
        console.error(`Error updating profile ${supabaseUserId}:`, profileUpdateError);
      } else {
        console.log(`Successfully updated profile for user ${supabaseUserId}`);
      }
    }
  } catch (error) {
    console.error(
      "Database error handling customer.updated:",
      (error as Error).message
    );
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("Invoice payment succeeded:", invoice.id);

  // Record successful invoice payment
  await supabase.from("invoices").upsert(
    {
      stripe_invoice_id: invoice.id,
      stripe_customer_id: invoice.customer as string,
      stripe_subscription_id: invoice.subscription as string,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      invoice_pdf: invoice.invoice_pdf,
      created_at: new Date().toISOString(),
    },
    { onConflict: "stripe_invoice_id" }
  );
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("Invoice payment failed:", invoice.id);

  // Record failed invoice payment
  await supabase.from("invoices").upsert(
    {
      stripe_invoice_id: invoice.id,
      stripe_customer_id: invoice.customer as string,
      stripe_subscription_id: invoice.subscription as string,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      created_at: new Date().toISOString(),
    },
    { onConflict: "stripe_invoice_id" }
  );

  // Optionally: Notify customer about payment failure
}

// Handler for charge.refunded events
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log("Charge refunded:", charge.id);

  // Check if this charge is associated with a payment intent
  if (!charge.payment_intent || typeof charge.payment_intent !== "string") {
    console.log("No payment intent associated with this charge, skipping");
    return;
  }

  // Find the payment intent to get booking information
  try {
    // Option 1: Use the new database function to update booking status
    const { data, error } = await supabase.rpc(
      "update_booking_status_for_payment",
      {
        payment_intent_id: charge.payment_intent,
        new_status: "payment_refunded",
      }
    );

    if (error) {
      console.error("Error updating booking status with RPC:", error);

      // Option 2: Fall back to direct update via bookings table
      const { error: directError } = await supabase
        .from("bookings")
        .update({ status: "payment_refunded" })
        .eq("stripe_payment_intent_id", charge.payment_intent);

      if (directError) {
        console.error("Error directly updating booking status:", directError);
      }
    } else {
      console.log("Successfully updated booking status to payment_refunded");
    }
  } catch (err) {
    console.error("Error handling charge refund:", err);
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stripe-webhook' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
