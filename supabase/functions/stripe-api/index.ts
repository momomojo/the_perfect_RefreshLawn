// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, User } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@12.4.0?dts";

// Define types for our handlers
interface ResponseHeaders {
  [key: string]: string;
}

interface PaymentIntentRequest {
  amount: number;
  currency?: string;
  payment_method_types?: string[];
}

interface CustomerRequest {
  name?: string;
  phone?: string;
}

interface SubscriptionRequest {
  priceId: string;
  paymentMethodId: string;
}

interface PaymentMethodRequest {
  paymentMethodId: string;
}

interface ListInvoicesRequest {
  limit?: number;
  starting_after?: string;
  customer?: string; // Allow filtering by Stripe Customer ID
}

interface CancelSubscriptionRequest {
  subscriptionId: string;
}

// Admin request interfaces
interface AdminListRequest {
  limit?: number;
  starting_after?: string; // Stripe cursor pagination
  search?: string; // Optional search term (implementation specific)
}

interface AdminDashboardLinkRequest {
  resourceType:
    | "customer"
    | "subscription"
    | "payment"
    | "invoice"
    | "product"
    | "price";
  resourceId: string;
}

interface AdminCancelSubscriptionRequest {
  subscriptionId: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("Hello from Functions!");

serve(async (req) => {
  // CORS headers
  const headers: ResponseHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers,
      status: 405,
    });
  }

  try {
    // Parse the request body FIRST to get the routing path and payload
    const body = await req.json();
    const routePath = body.path; // Get path from body
    const payload = body.payload; // Get payload from body

    // Get the JWT token from the request
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Verify the JWT token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers,
        status: 401,
      });
    }

    // Route the request based on the path from the body
    switch (routePath) {
      // Customer-facing endpoints
      case "create-payment-intent":
        return await handleCreatePaymentIntent(
          user,
          payload as PaymentIntentRequest, // Pass the PAYLOAD
          headers
        );
      case "create-customer":
        return await handleCreateCustomer(
          user,
          payload as CustomerRequest, // Pass the PAYLOAD
          headers
        );
      case "create-subscription":
        return await handleCreateSubscription(
          user,
          payload as SubscriptionRequest, // Pass the PAYLOAD
          headers
        );
      case "list-payment-methods":
        // This endpoint might not need a payload, adjust if necessary
        return await handleListPaymentMethods(user, headers);
      case "attach-payment-method":
        return await handleAttachPaymentMethod(
          user,
          payload as PaymentMethodRequest, // Pass the PAYLOAD
          headers
        );
      case "detach-payment-method":
        return await handleDetachPaymentMethod(
          user,
          payload as PaymentMethodRequest, // Pass the PAYLOAD
          headers
        );
      case "set-default-payment":
        return await handleSetDefaultPayment(
          user,
          payload as PaymentMethodRequest, // Pass the PAYLOAD
          headers
        );
      case "cancel-subscription":
        return await handleCancelSubscription(
          user,
          payload as CancelSubscriptionRequest, // Pass the PAYLOAD
          headers
        );
      case "list-invoices":
        return await handleListInvoices(
          user,
          payload as ListInvoicesRequest, // Pass the PAYLOAD
          headers
        );

      // Admin endpoints (require admin role)
      // Ensure these also expect payload if needed
      case "admin-list-customers":
        return await handleAdminListCustomers(
          user,
          payload as AdminListRequest, // Pass the PAYLOAD
          headers
        );
      case "admin-list-subscriptions":
        return await handleAdminListSubscriptions(
          user,
          payload as AdminListRequest, // Pass the PAYLOAD
          headers
        );
      case "admin-list-payments":
        return await handleAdminListPayments(
          user,
          payload as AdminListRequest, // Pass the PAYLOAD
          headers
        );
      case "admin-list-invoices":
        return await handleAdminListInvoices(
          user,
          payload as AdminListRequest, // Pass the PAYLOAD
          headers
        );
      case "admin-get-dashboard-link":
        return await handleAdminGetStripeDashboardLink(
          user,
          payload as AdminDashboardLinkRequest, // Pass the PAYLOAD
          headers
        );
      case "admin-cancel-subscription":
        return await handleAdminCancelSubscription(
          user,
          payload as AdminCancelSubscriptionRequest, // Pass the PAYLOAD
          headers
        );

      default:
        return new Response(JSON.stringify({ error: "Invalid route" }), {
          headers,
          status: 404,
        });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 500,
    });
  }
});

// Handler functions
async function handleCreatePaymentIntent(
  user: User,
  body: PaymentIntentRequest,
  headers: ResponseHeaders
) {
  const { amount, currency = "usd", payment_method_types = ["card"] } = body;

  try {
    // Get or create customer
    let customerId: string;
    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError) throw customerError;

    if (customers?.stripe_customer_id) {
      customerId = customers.stripe_customer_id;
    } else {
      // Create a new customer in Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save the customer ID to your database
      await supabase.from("customers").insert({
        user_id: user.id,
        stripe_customer_id: customerId,
      });
    }

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method_types,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
      }),
      { headers }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 400,
    });
  }
}

async function handleCreateCustomer(
  user: User,
  body: CustomerRequest,
  headers: ResponseHeaders
) {
  try {
    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingCustomer?.stripe_customer_id) {
      // Customer already exists, return existing ID
      return new Response(
        JSON.stringify({
          customerId: existingCustomer.stripe_customer_id,
          message: "Customer already exists",
        }),
        { headers }
      );
    }

    // Create a new customer in Stripe
    const customer = await stripe.customers.create({
      email: user.email,
      name: body.name,
      phone: body.phone,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    // Save the customer ID to your database
    await supabase.from("customers").insert({
      user_id: user.id,
      stripe_customer_id: customer.id,
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        customerId: customer.id,
        message: "Customer created successfully",
      }),
      { headers }
    );
  } catch (error) {
    console.error("Error creating customer:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 400,
    });
  }
}

async function handleCreateSubscription(
  user: User,
  body: SubscriptionRequest,
  headers: ResponseHeaders
) {
  const { priceId, paymentMethodId } = body;

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

    return new Response(
      JSON.stringify({
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: subscription.latest_invoice.payment_intent?.client_secret,
      }),
      { headers }
    );
  } catch (error) {
    console.error("Error creating subscription:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 400,
    });
  }
}

// --- Helper function to get Stripe Customer ID ---
async function getStripeCustomerId(userId: string): Promise<string> {
  const { data: customerData, error: customerError } = await supabase
    .from("customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (customerError) {
    console.error("Error fetching customer:", customerError);
    throw new Error("Failed to retrieve customer information.");
  }

  if (!customerData?.stripe_customer_id) {
    throw new Error("Stripe customer ID not found for this user.");
  }

  return customerData.stripe_customer_id;
}

// --- Payment Method Handlers ---

async function handleListPaymentMethods(user: User, headers: ResponseHeaders) {
  try {
    const customerId = await getStripeCustomerId(user.id);

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card", // Only list card payment methods for now
    });

    return new Response(JSON.stringify(paymentMethods.data), { headers });
  } catch (error) {
    console.error("Error listing payment methods:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 400,
    });
  }
}

async function handleAttachPaymentMethod(
  user: User,
  body: PaymentMethodRequest,
  headers: ResponseHeaders
) {
  const { paymentMethodId } = body;
  try {
    const customerId = await getStripeCustomerId(user.id);

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Optional: Set as default immediately after attaching
    // await stripe.customers.update(customerId, {
    //   invoice_settings: {
    //     default_payment_method: paymentMethodId,
    //   },
    // });

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (error) {
    console.error("Error attaching payment method:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 400,
    });
  }
}

async function handleDetachPaymentMethod(
  user: User,
  body: PaymentMethodRequest,
  headers: ResponseHeaders
) {
  const { paymentMethodId } = body;
  try {
    // Optional: Check if it's the default payment method first
    const customerId = await getStripeCustomerId(user.id);
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.invoice_settings?.default_payment_method === paymentMethodId) {
      throw new Error("Cannot detach the default payment method.");
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (error) {
    console.error("Error detaching payment method:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 400,
    });
  }
}

async function handleSetDefaultPayment(
  user: User,
  body: PaymentMethodRequest,
  headers: ResponseHeaders
) {
  const { paymentMethodId } = body;
  try {
    const customerId = await getStripeCustomerId(user.id);

    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (error) {
    console.error("Error setting default payment method:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 400,
    });
  }
}

// --- Subscription Management Handlers ---

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

    return new Response(JSON.stringify(deletedSubscription), { headers });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 400,
    });
  }
}

// Note: Updating subscriptions (changing plans) can be complex and might
// require handling proration. It's often simpler to cancel the existing
// subscription and create a new one.

// --- Admin Handlers ---

// Helper function to check if user is an admin
async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error checking admin status:", error);
    return false;
  }

  return data?.role === "admin";
}

async function handleAdminListCustomers(
  user: User,
  body: AdminListRequest,
  headers: ResponseHeaders
) {
  // First, check if the user has admin privileges
  if (!(await isAdmin(user.id))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      headers,
      status: 403,
    });
  }

  const { limit = 10, starting_after, search } = body;

  try {
    const params: Stripe.CustomerListParams = {
      limit,
      starting_after: starting_after || undefined,
    };

    // Basic search implementation (adjust as needed)
    if (search) {
      // Stripe customer list doesn't directly support a generic search query.
      // You might search by email if the 'search' term looks like an email.
      // Or fetch all and filter, which is inefficient for large datasets.
      // For this example, we'll assume search filters by email if it contains '@'.
      if (search.includes("@")) {
        params.email = search;
      }
      // Add more sophisticated search logic if required, potentially needing
      // multiple Stripe calls or searching your local DB mirror.
    }

    const customers = await stripe.customers.list(params);

    // Prepare response for cursor pagination
    const responseData = {
      data: customers.data,
      has_more: customers.has_more,
      next_page: customers.has_more
        ? customers.data[customers.data.length - 1]?.id
        : null,
    };

    return new Response(JSON.stringify(responseData), { headers });
  } catch (error) {
    console.error("Error listing admin customers:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 500,
    });
  }
}

async function handleAdminListSubscriptions(
  user: User,
  body: AdminListRequest,
  headers: ResponseHeaders
) {
  // First, check if the user has admin privileges
  if (!(await isAdmin(user.id))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      headers,
      status: 403,
    });
  }

  const { limit = 10, starting_after } = body;

  try {
    const params: Stripe.SubscriptionListParams = {
      limit,
      starting_after: starting_after || undefined,
      // Consider adding status filtering, e.g., status: 'active'
    };

    const subscriptions = await stripe.subscriptions.list(params);

    // Prepare response for cursor pagination
    const responseData = {
      data: subscriptions.data,
      has_more: subscriptions.has_more,
      next_page: subscriptions.has_more
        ? subscriptions.data[subscriptions.data.length - 1]?.id
        : null,
    };

    return new Response(JSON.stringify(responseData), { headers });
  } catch (error) {
    console.error("Error listing admin subscriptions:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 500,
    });
  }
}

async function handleAdminListPayments(
  user: User,
  body: AdminListRequest,
  headers: ResponseHeaders
) {
  // First, check if the user has admin privileges
  if (!(await isAdmin(user.id))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      headers,
      status: 403,
    });
  }

  const { limit = 10, starting_after } = body;

  try {
    const params: Stripe.PaymentIntentListParams = {
      limit,
      starting_after: starting_after || undefined,
    };

    const payments = await stripe.paymentIntents.list(params);

    // Prepare response for cursor pagination
    const responseData = {
      data: payments.data,
      has_more: payments.has_more,
      next_page: payments.has_more
        ? payments.data[payments.data.length - 1]?.id
        : null,
    };

    return new Response(JSON.stringify(responseData), { headers });
  } catch (error) {
    console.error("Error listing admin payments:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 500,
    });
  }
}

async function handleAdminListInvoices(
  user: User,
  body: AdminListRequest,
  headers: ResponseHeaders
) {
  // First, check if the user has admin privileges
  if (!(await isAdmin(user.id))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      headers,
      status: 403,
    });
  }

  const { limit = 10, starting_after } = body;

  try {
    const params: Stripe.InvoiceListParams = {
      limit,
      starting_after: starting_after || undefined,
      // Consider adding status filtering, e.g., status: 'paid'
    };

    const invoices = await stripe.invoices.list(params);

    // Prepare response for cursor pagination
    const responseData = {
      data: invoices.data,
      has_more: invoices.has_more,
      next_page: invoices.has_more
        ? invoices.data[invoices.data.length - 1]?.id
        : null,
    };

    return new Response(JSON.stringify(responseData), { headers });
  } catch (error) {
    console.error("Error listing admin invoices:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 500,
    });
  }
}

async function handleAdminGetStripeDashboardLink(
  user: User,
  body: AdminDashboardLinkRequest,
  headers: ResponseHeaders
) {
  // Admin check should happen in the main router
  // Re-added check here for robustness, although it's also in the router
  if (!(await isAdmin(user.id))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      headers,
      status: 403,
    });
  }

  const { resourceType, resourceId } = body;

  // Basic validation
  if (!resourceType || !resourceId) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      headers,
      status: 400,
    });
  }

  try {
    // Generate a link to the Stripe dashboard for the specified resource
    let dashboardUrl = "https://dashboard.stripe.com/";

    // Add the appropriate path based on the resource type
    switch (resourceType) {
      case "customer":
        dashboardUrl += `customers/${resourceId}`;
        break;
      case "subscription":
        dashboardUrl += `subscriptions/${resourceId}`;
        break;
      case "payment":
        dashboardUrl += `payments/${resourceId}`;
        break;
      case "invoice":
        dashboardUrl += `invoices/${resourceId}`;
        break;
      case "product":
        dashboardUrl += `products/${resourceId}`;
        break;
      case "price":
        dashboardUrl += `prices/${resourceId}`;
        break;
      default:
        throw new Error(`Invalid resource type: ${resourceType}`);
    }

    return new Response(JSON.stringify({ link: dashboardUrl }), { headers });
  } catch (error) {
    console.error("Error generating Stripe dashboard link:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 500,
    });
  }
}

// Admin endpoint to cancel a subscription
async function handleAdminCancelSubscription(
  user: User,
  body: AdminCancelSubscriptionRequest,
  headers: ResponseHeaders
) {
  // Admin check is done in the router
  const { subscriptionId } = body;

  if (!subscriptionId) {
    return new Response(
      JSON.stringify({ error: "Subscription ID is required" }),
      {
        headers,
        status: 400,
      }
    );
  }

  try {
    // Cancel the subscription in Stripe
    // Using cancel() immediately cancels. Use update() with cancel_at_period_end=true for end-of-period cancellation.
    const canceledSubscription = await stripe.subscriptions.cancel(
      subscriptionId
    );

    // The webhook handler ('stripe-webhook') should listen for 'customer.subscription.deleted'
    // or 'customer.subscription.updated' (with status=canceled) and update the local DB.
    // No direct DB update here to maintain single source of truth updates via webhooks.

    console.log(`Admin ${user.email} canceled subscription: ${subscriptionId}`);
    return new Response(JSON.stringify(canceledSubscription), { headers });
  } catch (error) {
    console.error(
      `Error canceling subscription ${subscriptionId} by admin:`,
      error
    );
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 500,
    });
  }
}

// Handle listing invoices for a specific customer (non-admin, user-specific)
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
      starting_after,
    });

    return new Response(JSON.stringify(invoices), { headers });
  } catch (error) {
    console.error("Error listing invoices:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers,
      status: 400,
    });
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stripe-api' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
