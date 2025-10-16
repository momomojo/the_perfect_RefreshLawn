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
  getOrCreateStripeCustomer,
  stripe,
  getSupabaseClient,
} from "../shared/stripe-utils.ts";
import { verifyUser } from "../shared/auth-utils.ts";

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
    const { data: existingCustomerRecord, error: customerDbError } =
      await supabase
        .from("customers")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (customerDbError) throw customerDbError;

    if (existingCustomerRecord?.stripe_customer_id) {
      // Customer already exists, maybe update?
      // For now, just return existing ID as per original logic.
      console.log(
        `Customer already exists (handleCreateCustomer): ${existingCustomerRecord.stripe_customer_id}`
      );
      return createSuccessResponse(
        {
          customerId: existingCustomerRecord.stripe_customer_id,
          message: "Customer already exists",
        },
        headers
      );
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
    const customerName =
      profileData?.first_name && profileData?.last_name
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
    console.log(
      `New Stripe customer created (handleCreateCustomer): ${customerId}`
    );

    // 5. Save the *complete* customer info to your 'customers' database
    const { data: customer, error: custError } = await supabase
      .from("customers")
      .upsert(
        { user_id: user.id, stripe_customer_id: customerId, email: user.email },
        { onConflict: "user_id" }
      )
      .select()
      .single();
    if (custError) throw custError;

    return createSuccessResponse(
      {
        customerId: customer.stripe_customer_id,
        message: "Customer created successfully",
      },
      headers
    );
  } catch (error) {
    console.error("Error in handleCreateCustomer:", error);
    return createErrorResponse((error as Error).message, 400, headers);
  }
}

// Helper function to list payment methods
async function handleListPaymentMethods(user: User, headers: ResponseHeaders) {
  try {
    // Get or create Stripe customer if one doesn't exist yet (fixes 400 error for new users)
    const supabase = getSupabaseClient();
    const customerId = await getOrCreateStripeCustomer(user, supabase);

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card", // Only list card payment methods for now
    });

    // Get default payment method
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethodId =
      customer.invoice_settings?.default_payment_method;

    // Format for client with nested card structure to match frontend expectations
    const formattedMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      card: {
        brand: pm.card?.brand || "",
        last4: pm.card?.last4 || "",
        expiryMonth: pm.card?.exp_month || 0,
        expiryYear: pm.card?.exp_year || 0,
      },
      isDefault: pm.id === defaultPaymentMethodId,
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

// Helper function to create a SetupIntent for saving payment methods
async function handleCreateSetupIntent(user: User, headers: ResponseHeaders) {
  try {
    // Get or create Stripe customer if one doesn't exist yet (fixes 400 error for new users)
    const supabase = getSupabaseClient();
    const customerId = await getOrCreateStripeCustomer(user, supabase);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      metadata: {
        supabase_user_id: user.id,
      },
    });

    return createSuccessResponse(
      {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      },
      headers
    );
  } catch (error) {
    console.error("Error creating setup intent:", error);
    return createErrorResponse((error as Error).message, 400, headers);
  }
}

// Main function handler
serve(async (req) => {
  console.log("=== STRIPE-CUSTOMER-API REQUEST START ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return handleCorsPreflightRequest();
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    console.error("Method not allowed:", req.method);
    return createErrorResponse("Method not allowed", 405, corsHeaders);
  }

  try {
    // Validate environment variables first
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check:");
    console.log("- STRIPE_SECRET_KEY:", stripeKey ? `Set (${stripeKey.substring(0, 7)}...)` : "NOT SET");
    console.log("- SUPABASE_URL:", supabaseUrl ? "Set" : "NOT SET");
    console.log("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "Set" : "NOT SET");

    if (!stripeKey) {
      console.error("FATAL: STRIPE_SECRET_KEY environment variable is not set");
      console.error("Available env vars:", Object.keys(Deno.env.toObject()));
      return createErrorResponse(
        "Server configuration error: Stripe API key not configured",
        500,
        corsHeaders
      );
    }

    // Parse the request body FIRST to get the routing path and payload
    console.log("Parsing request body...");
    let body;
    try {
      body = await parseRequestBody(req);
      console.log("Request body parsed successfully:", JSON.stringify(body));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return createErrorResponse(
        `Invalid request body: ${(parseError as Error).message}`,
        400,
        corsHeaders
      );
    }

    const routePath = body.path;
    const payload = body.payload || {};

    console.log("Extracted routePath:", routePath);
    console.log("Extracted payload:", JSON.stringify(payload));

    if (!routePath) {
      console.error("Missing 'path' in request body. Body:", JSON.stringify(body));
      return createErrorResponse(
        "Bad request: 'path' field is required in request body",
        400,
        corsHeaders
      );
    }

    // Verify the user
    console.log("Verifying user authentication...");
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);

    const user = await verifyUser(req);
    if (!user) {
      console.error("User verification failed - no valid user found");
      return createErrorResponse("Unauthorized: Invalid or missing authentication token", 401, corsHeaders);
    }

    console.log(`User verified successfully: ${user.id} (${user.email})`);
    console.log(
      `Routing to handler: path=${routePath}, user=${user.id}`
    );

    // Route the request based on the path from the body
    switch (routePath) {
      case "create-customer":
        console.log("Routing to: handleCreateCustomer");
        return await handleCreateCustomer(
          user,
          payload as CustomerRequest,
          corsHeaders
        );
      case "create-setup-intent":
        console.log("Routing to: handleCreateSetupIntent");
        return await handleCreateSetupIntent(user, corsHeaders);
      case "list-payment-methods":
        console.log("Routing to: handleListPaymentMethods");
        return await handleListPaymentMethods(user, corsHeaders);
      case "attach-payment-method":
        console.log("Routing to: handleAttachPaymentMethod");
        return await handleAttachPaymentMethod(
          user,
          payload as PaymentMethodRequest,
          corsHeaders
        );
      case "detach-payment-method":
        console.log("Routing to: handleDetachPaymentMethod");
        return await handleDetachPaymentMethod(
          user,
          payload as PaymentMethodRequest,
          corsHeaders
        );
      case "set-default-payment":
        console.log("Routing to: handleSetDefaultPayment");
        return await handleSetDefaultPayment(
          user,
          payload as PaymentMethodRequest,
          corsHeaders
        );
      default:
        console.error("Invalid path requested:", routePath);
        return createErrorResponse(`Invalid path: ${routePath}`, 404, corsHeaders);
    }
  } catch (error) {
    console.error("=== UNHANDLED ERROR IN MAIN HANDLER ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", (error as Error).message);
    console.error("Error stack:", (error as Error).stack);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    return createErrorResponse(
      `Internal server error: ${(error as Error).message}`,
      500,
      corsHeaders
    );
  } finally {
    console.log("=== STRIPE-CUSTOMER-API REQUEST END ===");
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
