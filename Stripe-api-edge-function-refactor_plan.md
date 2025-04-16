Detailed File-by-File Migration Checklist
This migration plan breaks down the process of splitting your monolithic stripe-api function into multiple specialized functions. Following this checklist will ensure all components continue to work correctly after refactoring.

1. Create Shared Utilities
supabase/functions/_shared/stripe-utils.ts
[ ] Create file with common Stripe utilities
[ ] Move getStripeCustomerId function here
[ ] Add proper type definitions
[ ] Export as named function
typescript
CopyInsert
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export async function getStripeCustomerId(userId: string): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
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
supabase/functions/_shared/auth-utils.ts
[ ] Create file with common auth utilities
[ ] Move isAdmin function here
[ ] Add JWT verification helpers if not already in cors.ts
[ ] Export as named functions
typescript
CopyInsert
import { createClient, User } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
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
supabase/functions/_shared/http-utils.ts
[ ] Create file with common HTTP response utilities
[ ] Add CORS headers definition
[ ] Add helper functions for standardized responses
[ ] Export as named constants/functions
typescript
CopyInsert
export const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type ResponseHeaders = typeof corsHeaders;

export function createErrorResponse(
  message: string, 
  status: number = 400, 
  headers: ResponseHeaders = corsHeaders
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { headers, status }
  );
}

export function createSuccessResponse(
  data: any, 
  headers: ResponseHeaders = corsHeaders
): Response {
  return new Response(
    JSON.stringify(data),
    { headers }
  );
}
2. Create New Edge Functions
supabase/functions/stripe-customer-api/index.ts
[ ] Create file with customer-related endpoints
[ ] Copy necessary imports from original file
[ ] Import shared utilities
[ ] Copy the following handler functions:
[ ] handleCreateCustomer
[ ] handleListPaymentMethods
[ ] handleAttachPaymentMethod
[ ] handleDetachPaymentMethod
[ ] handleSetDefaultPayment
[ ] Create a serve function with routing for these endpoints:
typescript
CopyInsert
serve(async (req) => {
  // CORS and auth handling...
  
  switch (routePath) {
    case "create-customer":
      return await handleCreateCustomer(user, payload, headers);
    case "list-payment-methods":
      return await handleListPaymentMethods(user, headers);
    case "attach-payment-method":
      return await handleAttachPaymentMethod(user, payload, headers);
    case "detach-payment-method":
      return await handleDetachPaymentMethod(user, payload, headers);
    case "set-default-payment":
      return await handleSetDefaultPayment(user, payload, headers);
    default:
      return createErrorResponse("Invalid route", 404, headers);
  }
});
supabase/functions/stripe-payment-api/index.ts
[ ] Create file with payment-related endpoints
[ ] Copy necessary imports from original file
[ ] Import shared utilities
[ ] Copy the following handler functions:
[ ] handleCreatePaymentIntent
[ ] handleCreateBookingAndCharge (from your booking fix)
[ ] Create a serve function with routing for these endpoints:
typescript
CopyInsert
serve(async (req) => {
  // CORS and auth handling...
  
  switch (routePath) {
    case "create-payment-intent":
      return await handleCreatePaymentIntent(user, payload, headers);
    case "create-booking-and-charge":
      return await handleCreateBookingAndCharge(user, payload, headers);
    default:
      return createErrorResponse("Invalid route", 404, headers);
  }
});
supabase/functions/stripe-subscription-api/index.ts
[ ] Create file with subscription-related endpoints
[ ] Copy necessary imports from original file
[ ] Import shared utilities
[ ] Copy the following handler functions:
[ ] handleCreateSubscription
[ ] handleCancelSubscription
[ ] handleListInvoices
[ ] Create a serve function with routing for these endpoints:
typescript
CopyInsert
serve(async (req) => {
  // CORS and auth handling...
  
  switch (routePath) {
    case "create-subscription":
      return await handleCreateSubscription(user, payload, headers);
    case "cancel-subscription":
      return await handleCancelSubscription(user, payload, headers);
    case "list-invoices":
      return await handleListInvoices(user, payload, headers);
    default:
      return createErrorResponse("Invalid route", 404, headers);
  }
});
supabase/functions/stripe-admin-api/index.ts
[ ] Create file with admin-only endpoints
[ ] Copy necessary imports from original file
[ ] Import shared utilities
[ ] Copy the following handler functions:
[ ] handleAdminListCustomers
[ ] handleAdminListSubscriptions
[ ] handleAdminListPayments
[ ] handleAdminListInvoices
[ ] handleAdminGetStripeDashboardLink
[ ] handleAdminCancelSubscription
[ ] Create a serve function with routing for these endpoints:
typescript
CopyInsert
serve(async (req) => {
  // CORS and auth handling...
  
  // Check admin status first
  if (!(await isAdmin(user.id))) {
    return createErrorResponse("Forbidden", 403, headers);
  }
  
  switch (routePath) {
    case "list-customers":  // Note: Simplified from admin-list-customers
      return await handleAdminListCustomers(user, payload, headers);
    case "list-subscriptions":
      return await handleAdminListSubscriptions(user, payload, headers);
    case "list-payments":
      return await handleAdminListPayments(user, payload, headers);
    case "list-invoices":
      return await handleAdminListInvoices(user, payload, headers);
    case "get-dashboard-link":
      return await handleAdminGetStripeDashboardLink(user, payload, headers);
    case "cancel-subscription":
      return await handleAdminCancelSubscription(user, payload, headers);
    default:
      return createErrorResponse("Invalid route", 404, headers);
  }
});
3. Update Frontend Components
app/components/common/ProfileSettings.tsx
[ ] Find all invoke('stripe-api' calls and update:
[ ] For payment method operations:
typescript
CopyInsert
// FROM:
const { data, error } = await supabase.functions.invoke("stripe-api", {
  body: { path: "list-payment-methods" },
  headers: { Authorization: `Bearer ${session.access_token}` }
});

// TO:
const { data, error } = await supabase.functions.invoke("stripe-customer-api", {
  body: { path: "list-payment-methods" },
  headers: { Authorization: `Bearer ${session.access_token}` }
});
app/components/common/AddPaymentMethodModal.tsx
[ ] Find all invoke('stripe-api' calls and update:
typescript
CopyInsert
// FROM:
const { data, error } = await supabase.functions.invoke("stripe-api", {
  body: { 
    path: "attach-payment-method", 
    payload: { paymentMethodId } 
  },
  headers: { Authorization: `Bearer ${session.access_token}` }
});

// TO:
const { data, error } = await supabase.functions.invoke("stripe-customer-api", {
  body: { 
    path: "attach-payment-method", 
    payload: { paymentMethodId } 
  },
  headers: { Authorization: `Bearer ${session.access_token}` }
});
app/components/customer/BookingForm.tsx
[ ] Find all invoke('stripe-api' calls and update:
typescript
CopyInsert
// FROM:
const { data, error } = await supabase.functions.invoke("stripe-api", {
  body: { 
    path: "create-booking-and-charge", 
    payload: bookingData 
  },
  headers: { Authorization: `Bearer ${session.access_token}` }
});

// TO:
const { data, error } = await supabase.functions.invoke("stripe-payment-api", {
  body: { 
    path: "create-booking-and-charge", 
    payload: bookingData 
  },
  headers: { Authorization: `Bearer ${session.access_token}` }
});
Other frontend components using Stripe API
[ ] Search in app/components/admin/ for any admin components using Stripe API
[ ] Search in app/screens/ for any screens directly calling Stripe API
[ ] Update all references following the same pattern:
Customer operations → stripe-customer-api
Payment operations → stripe-payment-api
Subscription operations → stripe-subscription-api
Admin operations → stripe-admin-api
4. Deploy and Test
Deployment
[ ] Deploy shared modules first:
bash
CopyInsert in Terminal
supabase functions deploy _shared
[ ] Deploy each new function:
bash
CopyInsert
supabase functions deploy stripe-customer-api
supabase functions deploy stripe-payment-api  
supabase functions deploy stripe-subscription-api
supabase functions deploy stripe-admin-api
Testing
[ ] Test customer profile operations:
[ ] Adding a payment method
[ ] Removing a payment method
[ ] Setting default payment method
[ ] Listing payment methods
[ ] Test booking and payment operations:
[ ] Creating a booking with payment
[ ] Processing payment intents
[ ] Test subscription operations (if used):
[ ] Creating a subscription
[ ] Canceling a subscription
[ ] Viewing invoices
[ ] Test admin operations:
[ ] Listing customers
[ ] Listing subscriptions
[ ] Viewing payment history
[ ] Accessing dashboard links
5. Clean Up
After confirming everything works:
[ ] Keep the original stripe-api function as a backup for 1-2 weeks
[ ] Once confident, remove or deprecate the original function:
bash
CopyInsert
# Option 1: Delete it
supabase functions delete stripe-api

# Option 2: Replace with deprecation notice
# Edit stripe-api/index.ts to return deprecation notices for all endpoints
6. Documentation
[ ] Update internal documentation with new function names
[ ] Document the new API structure for your team
[ ] Update any API documentation accessible to customers if applicable
[ ] Add comments in code about the refactoring for future reference
7. Monitoring
[ ] Set up logging for the new functions
[ ] Check Supabase function logs after deployment
[ ] Monitor for any unexpected errors after the migration
This detailed checklist ensures a smooth migration with minimal disruption. Would you like me to help with implementing any specific part of this migration plan?