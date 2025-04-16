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
  parseRequestBody
} from "../_shared/http-utils.ts";
import { 
  getStripeCustomerId, 
  stripe, 
  getSupabaseClient 
} from "../_shared/stripe-utils.ts";
import { 
  verifyUser, 
  isAdmin 
} from "../_shared/auth-utils.ts";

// Define interface types
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

// Helper function to list customers for admin
async function handleAdminListCustomers(
  user: User,
  body: AdminListRequest,
  headers: ResponseHeaders
) {
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

    return createSuccessResponse(responseData, headers);
  } catch (error) {
    console.error("Error listing admin customers:", error);
    return createErrorResponse((error as Error).message, 500, headers);
  }
}

// Helper function to list subscriptions for admin
async function handleAdminListSubscriptions(
  user: User,
  body: AdminListRequest,
  headers: ResponseHeaders
) {
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

    return createSuccessResponse(responseData, headers);
  } catch (error) {
    console.error("Error listing admin subscriptions:", error);
    return createErrorResponse((error as Error).message, 500, headers);
  }
}

// Helper function to list payments for admin
async function handleAdminListPayments(
  user: User,
  body: AdminListRequest,
  headers: ResponseHeaders
) {
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

    return createSuccessResponse(responseData, headers);
  } catch (error) {
    console.error("Error listing admin payments:", error);
    return createErrorResponse((error as Error).message, 500, headers);
  }
}

// Helper function to list invoices for admin
async function handleAdminListInvoices(
  user: User,
  body: AdminListRequest,
  headers: ResponseHeaders
) {
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

    return createSuccessResponse(responseData, headers);
  } catch (error) {
    console.error("Error listing admin invoices:", error);
    return createErrorResponse((error as Error).message, 500, headers);
  }
}

// Helper function to get Stripe dashboard link for admin
async function handleAdminGetStripeDashboardLink(
  user: User,
  body: AdminDashboardLinkRequest,
  headers: ResponseHeaders
) {
  const { resourceType, resourceId } = body;

  // Basic validation
  if (!resourceType || !resourceId) {
    return createErrorResponse("Invalid request", 400, headers);
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

    return createSuccessResponse({ link: dashboardUrl }, headers);
  } catch (error) {
    console.error("Error generating Stripe dashboard link:", error);
    return createErrorResponse((error as Error).message, 500, headers);
  }
}

// Helper function to cancel subscription for admin
async function handleAdminCancelSubscription(
  user: User,
  body: AdminCancelSubscriptionRequest,
  headers: ResponseHeaders
) {
  const { subscriptionId } = body;

  if (!subscriptionId) {
    return createErrorResponse("Subscription ID is required", 400, headers);
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
    return createSuccessResponse(canceledSubscription, headers);
  } catch (error) {
    console.error(
      `Error canceling subscription ${subscriptionId} by admin:`,
      error
    );
    return createErrorResponse((error as Error).message, 500, headers);
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
    return createErrorResponse("Method not allowed", 405);
  }

  try {
    // Parse the request body FIRST to get the routing path and payload
    const body = await parseRequestBody(req);
    const routePath = body.path; // Get path from body
    const payload = body.payload || {}; // Get payload from body

    // Verify the user
    const user = await verifyUser(req);
    if (!user) {
      return createErrorResponse("Unauthorized", 401);
    }

    // Verify admin privileges for all routes in this function
    if (!(await isAdmin(user.id))) {
      console.error(`User ${user.id} attempted to access admin API without privileges`);
      return createErrorResponse("Forbidden - Admin privileges required", 403);
    }

    console.log(`stripe-admin-api called: path=${routePath}, admin=${user.id}`);

    // Simplified path names since this is in the admin-specific function
    switch (routePath) {
      case "list-customers":
        return await handleAdminListCustomers(user, payload, corsHeaders);
      case "list-subscriptions":
        return await handleAdminListSubscriptions(user, payload, corsHeaders);
      case "list-payments":
        return await handleAdminListPayments(user, payload, corsHeaders);
      case "list-invoices":
        return await handleAdminListInvoices(user, payload, corsHeaders);
      case "get-dashboard-link":
        return await handleAdminGetStripeDashboardLink(user, payload, corsHeaders);
      case "cancel-subscription":
        return await handleAdminCancelSubscription(user, payload, corsHeaders);
      default:
        return createErrorResponse("Invalid route", 404);
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return createErrorResponse((error as Error).message, 500);
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stripe-admin-api' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"path":"list-customers", "payload":{"limit":5}}'

*/
