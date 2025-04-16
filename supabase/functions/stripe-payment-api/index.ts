// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { User, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2.7.1";
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
import { verifyUser } from "../_shared/auth-utils.ts";

// Define interface types
interface PaymentIntentRequest {
  amount: number;
  currency?: string;
  payment_method_types?: string[];
}

// Define basic Booking type
interface Booking {
  id: string; // Assuming UUID
  customer_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  recurring_plan_id?: string | null;
  price: number;
  status: string;
  stripe_payment_intent_id?: string | null;
  stripe_subscription_id?: string | null;
  created_at?: string;
  updated_at?: string;
  notes?: string;
}

// Define payload types for booking creation
interface CreateBookingPayload {
  serviceId: string;
  date: string;
  time: string;
  address: string;
  price: number;
  paymentMethodId: string; // Stripe PaymentMethod ID or 'cash'
  isRecurring: boolean;
  recurringPlanId?: string;
}

// Helper function to create a payment intent
async function handleCreatePaymentIntent(
  user: User,
  body: PaymentIntentRequest,
  headers: ResponseHeaders
) {
  const { amount, currency = "usd", payment_method_types = ["card"] } = body;
  const supabase = getSupabaseClient();

  try {
    // 1. Fetch user profile data from Supabase
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", user.id)
      .single(); // Use single() assuming one profile per user

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 means no rows found, which might be okay if profile is optional
      // Handle other errors (like database connection issues)
      console.error("Error fetching profile:", profileError);
      throw new Error("Could not fetch user profile.");
    }

    // Construct customer details from profile or fallbacks
    const customerName = profileData?.first_name && profileData?.last_name
      ? `${profileData.first_name} ${profileData.last_name}`
      : null; // Fallback to null if names missing
    const customerEmail = user.email;
    const customerPhone = profileData?.phone || null; // Use profile phone or null

    // 2. Get or create Stripe customer ID from our database
    let customerId: string;
    const { data: customerRecord, error: customerDbError } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerDbError) throw customerDbError;

    if (customerRecord?.stripe_customer_id) {
      // 3a. Customer exists - Update Stripe and local DB
      customerId = customerRecord.stripe_customer_id;
      console.log(`Existing Stripe customer found: ${customerId}`);

      // Update Stripe customer with latest profile data
      await stripe.customers.update(customerId, {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      });

      // Update local 'customers' table (ensure consistency)
      await supabase
        .from("customers")
        .update({
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

    } else {
      // 3b. Customer doesn't exist - Create in Stripe and save to local DB
      console.log(`Creating new Stripe customer for user: ${user.id}`);
      const stripeCustomer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        phone: customerPhone,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = stripeCustomer.id;
      console.log(`New Stripe customer created: ${customerId}`);

      // Save the *complete* customer info to your 'customers' database
      await supabase.from("customers").insert({
        user_id: user.id,
        stripe_customer_id: customerId,
        name: customerName, // Store the name used in Stripe
        email: customerEmail, // Store the email used in Stripe
        phone: customerPhone, // Store the phone used in Stripe
        created_at: new Date().toISOString(),
      });
    }

    // 4. Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method_types,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    console.log(`Payment intent created: ${paymentIntent.id} for customer ${customerId}`);

    return createSuccessResponse({
      clientSecret: paymentIntent.client_secret,
    }, headers);
  } catch (error) {
    console.error("Error in handleCreatePaymentIntent:", error);
    return createErrorResponse((error as Error).message, 400, headers);
  }
}

// Helper function to create a booking and process payment
async function handleCreateBookingAndCharge(
  user: User,
  body: CreateBookingPayload,
  headers: ResponseHeaders
) {
  console.log("Handling create-booking-and-charge request:", body);
  const supabase = getSupabaseClient();

  // Validate required fields
  if (!body.serviceId || !body.date || !body.time || !body.address || body.price == null || !body.paymentMethodId) {
    return createErrorResponse("Missing required booking details.", 400, headers);
  }

  try {
    // 1. Fetch Customer ID (assuming getStripeCustomerId handles profile/customer lookup)
    let customerId: string | null = null;
    try {
      customerId = await getStripeCustomerId(user.id);
    } catch (error) {
      // If not a cash payment, this is a problem
      if (body.paymentMethodId !== 'cash') {
        console.error(`Stripe Customer ID not found for user ${user.id} and payment is not cash.`);
        throw new Error("Stripe customer profile not found. Cannot process card payment.");
      }
      // For cash payments, we can proceed without a customer ID
    }
    
    if (customerId) {
      console.log(`Using Stripe Customer ID: ${customerId} for user ${user.id}`);
    } else {
      console.log(`No Stripe Customer ID for user ${user.id}, but using cash payment.`);
    }

    // 2. Create the booking record in our database
    let insertError: Error | PostgrestError | null = null;
    let insertedBooking: Booking | null = null;
    let successfulTableName = "bookings"; // Assume success in primary table first

    // Helper to insert into a table and return result or error
    const insertIntoTable = async (
      tableName: string,
      data: Partial<Booking>
    ): Promise<{ result: Booking | null; error: PostgrestError | null }> => {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single<Booking>(); // Specify return type
      return { result, error };
    };

    // Prepare common booking data, always start with 'pending' status
    const bookingData: Partial<Booking> = {
      customer_id: user.id,
      service_id: body.serviceId,
      scheduled_date: body.date,
      scheduled_time: body.time,
      address: body.address,
      recurring_plan_id: body.recurringPlanId || null,
      price: body.price,
      status: "pending", // <<< Always start as pending
    };

    try {
      // Try inserting into 'bookings' first
      console.log(`Attempting insert into ${successfulTableName} with data:`, bookingData);
      const { result, error } = await insertIntoTable(successfulTableName, bookingData);

      if (error) {
        console.error(`Error creating booking in '${successfulTableName}' table:`, JSON.stringify(error));
        insertError = error;

        // If error is 'violates check constraint', handle specifically
        if (error.code === "23514") {
          console.error(`Check constraint violation for status: ${bookingData.status}`);
          throw new Error(
            `Booking status "${bookingData.status}" violates database constraint.`
          );
        }
        // If error is 'undefined table', try 'customer_bookings'
        else if (error.code === "42P01") {
          console.log("Table 'bookings' not found, trying 'customer_bookings'...");
          successfulTableName = "customer_bookings"; // Update potential success table
          console.log(`Attempting insert into ${successfulTableName} with data:`, bookingData);
          const { result: altResult, error: altError } = await insertIntoTable(
            successfulTableName,
            bookingData // Use the same data
          );

          if (altError) {
            console.error(
              `Error creating booking in '${successfulTableName}' table:`, JSON.stringify(altError)
            );
            // If alternative table also fails with constraint violation, handle it
            if (altError.code === "23514") {
              console.error(
                `Check constraint violation for status in alt table: ${bookingData.status}`
              );
              throw new Error(
                `Booking status "${bookingData.status}" violates database constraint (alt table).`
              );
            }
            insertError = altError; // Keep the error from the alternative table
            successfulTableName = "bookings"; // Revert if alt failed
          } else {
            console.log(
              `Booking created successfully in '${successfulTableName}':`, altResult
            );
            insertedBooking = altResult;
            insertError = null; // Clear error if successful
          }
        } else {
          // For other errors, just keep the original error
          insertError = error;
        }
      } else {
        console.log(
          `Booking created successfully in '${successfulTableName}':`, result
        );
        insertedBooking = result;
      }
    } catch (err: unknown) {
      // Catch errors thrown from within the try block (like the check constraint error)
      insertError = err instanceof Error ? err : new Error(String(err));
    }

    // If there's still an error after trying alternatives or due to constraint violation, throw
    if (insertError) {
      console.error("Final booking insert error:", insertError);
      const message =
        insertError instanceof Error ? insertError.message : String(insertError);
      // Return 500 for insertion errors
      return createErrorResponse(`Failed to create booking: ${message}`, 500, headers);
    }

    if (!insertedBooking) {
      // This case should ideally not be reached if error handling is correct
      console.error("Booking creation failed, no record returned and no error thrown.");
      return createErrorResponse(
        "Booking creation failed, no record returned and no error thrown.",
        500,
        headers
      );
    }

    const bookingId = insertedBooking.id;
    console.log(`Booking created with ID: ${bookingId} in table: ${successfulTableName}, initial status: ${insertedBooking.status}`);

    // 3. Handle Cash Payment
    if (body.paymentMethodId === "cash") {
      console.log(`Cash payment for booking ${bookingId}. Updating status.`);
      // Update status to 'confirmed' assuming cash means confirmed immediately
      const { error: cashUpdateError } = await supabase
        .from(successfulTableName) // << Use the table where insertion succeeded
        .update({ status: "confirmed" })
        .eq("id", bookingId);

      if (cashUpdateError) {
        console.error(
          `Error updating cash booking ${bookingId} status to confirmed:`, cashUpdateError
        );
        // Return success but include a warning message
        return createSuccessResponse({
          success: true,
          booking: insertedBooking, // Return booking with original 'pending' status
          message:
            "Booking created successfully (cash), but failed to update status to confirmed.",
        }, headers);
      } else {
        console.log(`Booking ${bookingId} status updated to confirmed for cash payment.`);
        insertedBooking.status = "confirmed"; // Update local object status
      }

      // Return success response for cash booking
      return createSuccessResponse({
        success: true,
        booking: insertedBooking, // Return booking with 'confirmed' status
        message: "Booking created successfully with cash payment option.",
      }, headers);
    }

    // 4. Handle Card Payment: Create Payment Intent (but DO NOT confirm here)
    let paymentIntent: Stripe.PaymentIntent | null = null;
    let clientSecret: string | null = null;
    try {
      if (!customerId) {
        // Double check - this should have been caught earlier
        throw new Error("Stripe customer ID is required for card payments.");
      }
      console.log(`Creating Payment Intent for booking ${bookingId} using method ${body.paymentMethodId}`);
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(body.price * 100), // Convert to cents and ensure integer
        currency: "usd",
        customer: customerId,
        // Use payment_method_types instead of directly attaching payment_method
        payment_method_types: ["card"],
        description: `Booking #${bookingId} for service ${body.serviceId}`,
        metadata: {
          booking_id: bookingId,
          user_id: user.id,
          payment_method_id: body.paymentMethodId !== 'cash' ? body.paymentMethodId : 'cash' // Store payment method ID in metadata
        },
        // Add setup_future_usage if you plan to save the card
        // setup_future_usage: 'off_session', // Example: if saving card for later
      });
      clientSecret = paymentIntent.client_secret; // Get the secret for the client
      console.log(`PaymentIntent ${paymentIntent.id} created for client-side confirmation.`);

      // Save payment method ID in notes since there's no payment_method column
      const paymentMethodInfo = `Payment Method: ${body.paymentMethodId}`;
      
      // If there are existing notes, append to them
      if (insertedBooking.notes) {
        await supabase
          .from(successfulTableName)
          .update({ 
            notes: `${insertedBooking.notes}. ${paymentMethodInfo}`
          })
          .eq("id", bookingId);
      } else {
        await supabase
          .from(successfulTableName)
          .update({ notes: paymentMethodInfo })
          .eq("id", bookingId);
      }

      // 5. Update booking with Payment Intent ID (but NOT final status yet)
      console.log(`Updating booking ${bookingId} in ${successfulTableName} with PI ID: ${paymentIntent.id}`);
      const { data: updatedBooking, error: updateError } = await supabase
        .from(successfulTableName) // << Use the table where insertion succeeded
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          notes: `Payment Intent ${paymentIntent.id} created with status: ${paymentIntent.status}. Requires client confirmation.`,
          status: "pending", // Use valid status from database constraint
        })
        .eq("id", bookingId)
        .select()
        .single<Booking>();

      if (updateError) {
        console.error(
          `Error updating booking ${bookingId} with PI ID:`, updateError
        );
        // If update fails, still return clientSecret so client can try to pay
        return createSuccessResponse({
          success: false, // Indicate partial success (PI created, DB update failed)
          booking: insertedBooking, // Return original booking
          message: `Payment Intent created, but failed to update booking record. Payment Intent ID: ${paymentIntent.id}`,
          client_secret: clientSecret, // CRITICAL: Return secret for client
          payment_intent_id: paymentIntent.id,
          requires_payment_confirmation: true, // Signal to client
        }, headers);
      }

      // Payment Intent created, booking updated with PI ID. Client needs to confirm.
      console.log(`Booking ${bookingId} updated with PI ID, status: ${updatedBooking?.status}. Ready for client confirmation.`);
      return createSuccessResponse({
        success: true,
        booking: updatedBooking, // Return booking with 'pending' status
        message: "Booking created, Payment Intent ready for client confirmation.",
        client_secret: clientSecret, // CRITICAL: Return secret for client
        payment_intent_id: paymentIntent.id,
        requires_payment_confirmation: true, // Signal to client
      }, headers);

    } catch (paymentError: unknown) {
      // Error occurred during Stripe Payment Intent *creation*
      console.error(`Stripe Payment Intent Creation Error for booking ${bookingId}:`, paymentError);

      let errorMessage = "Payment processing failed.";
      let stripeErrorCode = "unknown_error";
        
      // Type assertion for paymentError
      if (paymentError && typeof paymentError === 'object' && 'type' in paymentError) {
        // It's likely a Stripe error
        const stripeError = paymentError as Stripe.errors.StripeError;
        errorMessage = stripeError.message || errorMessage;
        stripeErrorCode = stripeError.code || stripeErrorCode;
      } else if (paymentError && paymentError instanceof Error) {
        errorMessage = (paymentError as Error).message;
      }

      // Update booking status to indicate payment setup failure
      console.log(`Updating booking ${bookingId} in ${successfulTableName} to status: cancelled due to PI creation error`);
      const { error: failUpdateError } = await supabase
        .from(successfulTableName) // << Use the table where insertion succeeded
        .update({
          status: "cancelled", // Use valid status from database constraint
          notes: `Payment failed: ${errorMessage} (Code: ${stripeErrorCode})`,
        })
        .eq("id", bookingId);

      if (failUpdateError) {
        console.error(
          `Failed to update booking ${bookingId} status after payment intent creation failure:`, failUpdateError
        );
      }

      // Return a specific error indicating payment setup failure (e.g., 400 or 500)
      return new Response(
        JSON.stringify({
          error: "Payment setup failed.",
          message: errorMessage,
          booking_id: bookingId, // Include booking ID for reference
          stripe_error_code: stripeErrorCode,
        }),
        { headers, status: 400 } // Use 400 for client-related errors (like invalid card details if provided), 500 for server issues
      );
    }
  } catch (error: unknown) {
    // Catch all other unhandled errors in the main try block
    console.error("Unhandled error in create-booking-and-charge:", error);
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Server error: ${message}`, 500, headers);
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

    console.log(`stripe-payment-api called: path=${routePath}, user=${user.id}`);

    // Route the request based on the path from the body
    switch (routePath) {
      case "create-payment-intent":
        return await handleCreatePaymentIntent(user, payload, corsHeaders);
      case "create-booking-and-charge":
        return await handleCreateBookingAndCharge(user, payload, corsHeaders);
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stripe-payment-api' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"path":"create-payment-intent", "payload":{"amount":1000, "currency":"usd"}}'

*/
