// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { User } from "https://esm.sh/@supabase/supabase-js@2.7.1";
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
import { verifyUser } from "../_shared/auth-utils.ts";

// Define interface types
interface CustomerRequest {
  name?: string;
  phone?: string;
}

interface PaymentMethodRequest {
  paymentMethodId: string;
}

// Helper function to create a customer
async function handleCreateCustomer(
  user: User,
  body: CustomerRequest,
  headers: ResponseHeaders
) {
  try {
    const supabase = getSupabaseClient();
    
    // 1. Check if customer already exists in our database
    const { data: existingCustomerRecord, error: customerDbError } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerDbError) throw customerDbError;

    if (existingCustomerRecord?.stripe_customer_id) {
      // Customer already exists, maybe update?
      // For now, just return existing ID as per original logic.
      console.log(`Customer already exists (handleCreateCustomer): ${existingCustomerRecord.stripe_customer_id}`);
      return createSuccessResponse({
        customerId: existingCustomerRecord.stripe_customer_id,
        message: "Customer already exists",
      }, headers);
    }

    // 2. Fetch profile data as primary source
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching profile:", profileError);
      throw new Error("Could not fetch user profile.");
    }

    // 3. Construct customer details using profile first, then body/auth fallbacks
    const customerName = profileData?.first_name && profileData?.last_name
      ? `${profileData.first_name} ${profileData.last_name}`
      : body.name || null; // Fallback to body.name if profile names missing
    const customerEmail = user.email;
    const customerPhone = profileData?.phone || body.phone || null; // Use profile phone or body.phone

    // 4. Create a new customer in Stripe
    const stripeCustomer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      phone: customerPhone,
      metadata: {
        supabase_user_id: user.id,
      },
    });
    const customerId = stripeCustomer.id;
    console.log(`New Stripe customer created (handleCreateCustomer): ${customerId}`);

    // 5. Save the *complete* customer info to your 'customers' database
    await supabase.from("customers").insert({
      user_id: user.id,
      stripe_customer_id: customerId,
      name: customerName, // Store the name used in Stripe
      email: customerEmail, // Store the email used in Stripe
      phone: customerPhone, // Store the phone used in Stripe
      created_at: new Date().toISOString(),
    });

    return createSuccessResponse({
      customerId: customerId,
      message: "Customer created successfully",
    }, headers);
  } catch (error) {
    console.error("Error in handleCreateCustomer:", error);
    return createErrorResponse((error as Error).message, 400, headers);
  }
}

// Helper function to list payment methods
async function handleListPaymentMethods(user: User, headers: ResponseHeaders) {
  try {
    const customerId = await getStripeCustomerId(user.id);

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card", // Only list card payment methods for now
    });

    // Get default payment method
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

    // Format for client with nested card structure to match frontend expectations
    const formattedMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      card: {
        brand: pm.card?.brand || '',
        last4: pm.card?.last4 || '',
        expiryMonth: pm.card?.exp_month || 0,
        expiryYear: pm.card?.exp_year || 0
      },
      isDefault: pm.id === defaultPaymentMethodId
    }));

    return createSuccessResponse({ paymentMethods: formattedMethods }, headers);
  } catch (error) {
    console.error("Error listing payment methods:", error);
    return createErrorResponse((error as Error).message, 400, headers);
  }
}

// Helper function to attach a payment method
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

    return createSuccessResponse({ success: true }, headers);
  } catch (error) {
    console.error("Error attaching payment method:", error);
    return createErrorResponse((error as Error).message, 400, headers);
  }
}

// Helper function to detach a payment method
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
    
    // @ts-ignore - The types are a bit off here
    if (customer.invoice_settings?.default_payment_method === paymentMethodId) {
      throw new Error("Cannot detach the default payment method.");
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    return createSuccessResponse({ success: true }, headers);
  } catch (error) {
    console.error("Error detaching payment method:", error);
    return createErrorResponse((error as Error).message, 400, headers);
  }
}

// Helper function to set default payment method
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

    return createSuccessResponse({ success: true }, headers);
  } catch (error) {
    console.error("Error setting default payment method:", error);
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

    console.log(`stripe-customer-api called: path=${routePath}, user=${user.id}`);

    // Route the request based on the path from the body
    switch (routePath) {
      case "create-customer":
        return await handleCreateCustomer(user, payload, corsHeaders);
      case "list-payment-methods":
        return await handleListPaymentMethods(user, corsHeaders);
      case "attach-payment-method":
        return await handleAttachPaymentMethod(user, payload, corsHeaders);
      case "detach-payment-method":
        return await handleDetachPaymentMethod(user, payload, corsHeaders);
      case "set-default-payment":
        return await handleSetDefaultPayment(user, payload, corsHeaders);
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stripe-customer-api' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"path":"list-payment-methods"}'

*/
