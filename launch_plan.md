# Comprehensive Launch Readiness Plan

## Priority 1: Critical Database Optimizations

### Task 1.1: Add Database Indexes and Fields for Performance

**Subtasks:**

1. **Add indexes for frequently queried fields**

   ```sql
   -- Add indexes for frequently queried fields
   CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
   CREATE INDEX IF NOT EXISTS idx_bookings_technician_id ON bookings(technician_id);
   CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
   CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
   CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON bookings(scheduled_date);
   CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
   ```

2. **Add constraints for data integrity**

   ```sql
   -- Add constraints for payment status transitions
   ALTER TABLE bookings ADD CONSTRAINT valid_status_values
     CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled'));

   -- Add foreign key constraints for Stripe IDs
   ALTER TABLE profiles ADD CONSTRAINT unique_stripe_customer_id
     UNIQUE (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
   ```

3. **Add Stripe-related fields to tables**

   ```sql
   -- Add Stripe product ID and price ID fields to services table
   ALTER TABLE services ADD COLUMN stripe_product_id text;
   ALTER TABLE services ADD COLUMN stripe_price_id text;

   -- Add Stripe price ID field to recurring_plans table
   ALTER TABLE recurring_plans ADD COLUMN stripe_price_id text;
   ```

4. **Optimize query performance**
   - Review and optimize any slow queries in your application
   - Add composite indexes for common query patterns:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON bookings(customer_id, status);
   CREATE INDEX IF NOT EXISTS idx_bookings_tech_date ON bookings(technician_id, scheduled_date);
   ```

### Task 1.2: Implement Batch Queries and Reduce Network Requests

**Subtasks:**

1. **Refactor data fetching in lib/data.ts**

   - Replace multiple separate queries with batch queries:

   ```typescript
   // Instead of separate queries
   export async function getBookingWithRelations(bookingId: string) {
     const { data, error } = await supabase
       .from("bookings")
       .select(
         `
         *,
         service:services(*),
         customer:profiles!bookings_customer_id_fkey(*),
         technician:profiles!bookings_technician_id_fkey(*),
         recurring_plan:recurring_plans(*)
       `
       )
       .eq("id", bookingId)
       .single();

     if (error) throw error;
     return data;
   }
   ```

2. **Implement pagination for list views**

   ```typescript
   export async function getCustomerBookings(
     customerId: string,
     page = 1,
     pageSize = 10
   ) {
     const { data, error, count } = await supabase
       .from("bookings")
       .select("*", { count: "exact" })
       .eq("customer_id", customerId)
       .order("scheduled_date", { ascending: false })
       .range((page - 1) * pageSize, page * pageSize - 1);

     if (error) throw error;
     return { data, totalCount: count };
   }
   ```

3. **Implement proper error handling and retry logic**
   - Add consistent error handling across all data operations
   - Implement retry mechanisms for transient failures


## Priority 2: Stripe Integration Setup

### Task 2.1: Set Up Stripe Account and API Keys

**Subtasks:**

1. **Create a Stripe account**

   - Go to [stripe.com](https://stripe.com) and sign up for an account
   - Complete the verification process
   - Navigate to the Dashboard

2. **Generate API keys**

   - In the Stripe Dashboard, go to Developers > API keys
   - Copy the Publishable key and Secret key for test mode
   - Store these securely for later use
   - Set up Supabase secrets for the keys:
     ```bash
     # Set Stripe API keys as Supabase secrets
     supabase secrets set STRIPE_SECRET_KEY=sk_test_your_test_key
     supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
     supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
     ```

3. **Configure webhook endpoints**
   - In the Stripe Dashboard, go to Developers > Webhooks
   - Add your production webhook endpoint URL:
     ```
     https://sjgixmidwtwzbduakzkk.supabase.co/functions/v1/stripe-webhook
     ```
   - Configure webhook signing secret in Stripe dashboard
   - Add these events to your webhook configuration:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.updated`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

### Task 2.2: Set Up Streamlined Stripe Integration

**Subtasks:**

1. **Implement a streamlined approach for Stripe integration**

   - Use Edge Functions for all Stripe operations (customer-facing, admin, and webhook handling)
   - Use React Native SDK for client-side payment processing
   - Store Stripe data in local database tables for querying and reporting
   - This approach simplifies the architecture and reduces potential points of failure

2. **Create database schema for Stripe data**

   - Connect to your Supabase database using the SQL editor
   - Run the following SQL to create the necessary tables:

     ```sql
     -- Create customers table to link Supabase users with Stripe customers
     CREATE TABLE IF NOT EXISTS public.customers (
       id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       stripe_customer_id text NOT NULL UNIQUE,
       email text,
       name text,
       phone text,
       created_at timestamptz NOT NULL DEFAULT now(),
       updated_at timestamptz
     );

     -- Create subscriptions table to track Stripe subscriptions
     CREATE TABLE IF NOT EXISTS public.subscriptions (
       id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       stripe_subscription_id text NOT NULL UNIQUE,
       stripe_customer_id text NOT NULL REFERENCES public.customers(stripe_customer_id) ON DELETE CASCADE,
       status text NOT NULL,
       price_id text NOT NULL,
       current_period_start timestamptz,
       current_period_end timestamptz,
       canceled_at timestamptz,
       created_at timestamptz NOT NULL DEFAULT now(),
       updated_at timestamptz
     );

     -- Create payments table to track one-time payments
     CREATE TABLE IF NOT EXISTS public.payments (
       id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       stripe_payment_id text NOT NULL UNIQUE,
       stripe_customer_id text NOT NULL REFERENCES public.customers(stripe_customer_id) ON DELETE CASCADE,
       amount integer NOT NULL,
       currency text NOT NULL,
       status text NOT NULL,
       payment_method text,
       error_message text,
       created_at timestamptz NOT NULL DEFAULT now()
     );

     -- Create invoices table to track Stripe invoices
     CREATE TABLE IF NOT EXISTS public.invoices (
       id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
       stripe_invoice_id text NOT NULL UNIQUE,
       stripe_customer_id text NOT NULL REFERENCES public.customers(stripe_customer_id) ON DELETE CASCADE,
       stripe_subscription_id text REFERENCES public.subscriptions(stripe_subscription_id) ON DELETE SET NULL,
       amount_paid integer NOT NULL,
       currency text NOT NULL,
       status text NOT NULL,
       invoice_pdf text,
       created_at timestamptz NOT NULL DEFAULT now()
     );

     -- Enable RLS on all tables
     ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
     ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
     ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
     ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

     -- Add RLS policies
     CREATE POLICY "Users can view their own customer data" ON public.customers
       FOR SELECT USING (auth.uid() = user_id);

     CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
       FOR SELECT USING (auth.uid() = user_id);

     CREATE POLICY "Users can view their own payments" ON public.payments
       FOR SELECT USING (auth.uid() = user_id);

     CREATE POLICY "Users can view their own invoices" ON public.invoices
       FOR SELECT USING (auth.uid() = (SELECT c.user_id FROM public.customers c WHERE c.stripe_customer_id = public.invoices.stripe_customer_id));

     -- Add service role policies for Edge Functions
     CREATE POLICY "Service role can do all operations on customers" ON public.customers
       FOR ALL USING (auth.role() = 'service_role');

     CREATE POLICY "Service role can do all operations on subscriptions" ON public.subscriptions
       FOR ALL USING (auth.role() = 'service_role');

     CREATE POLICY "Service role can do all operations on payments" ON public.payments
       FOR ALL USING (auth.role() = 'service_role');

     CREATE POLICY "Service role can do all operations on invoices" ON public.invoices
       FOR ALL USING (auth.role() = 'service_role');
     ```

3. **Create Edge Function for customer-facing and admin operations**

   ```bash
   # Create Edge Functions for Stripe operations
   supabase functions new stripe-api
   supabase functions new stripe-webhook
   ```

   ```typescript
   // In supabase/functions/stripe-api/index.ts
   import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
   import {
     createClient,
     User,
   } from "https://esm.sh/@supabase/supabase-js@2.7.1";
   import Stripe from "https://esm.sh/stripe@12.4.0?dts";

   const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
   const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
   const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

   const stripe = new Stripe(stripeSecretKey, {
     apiVersion: "2023-10-16",
   });

   const supabase = createClient(supabaseUrl, supabaseServiceKey);

   serve(async (req) => {
     // CORS headers
     const headers = {
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
       const url = new URL(req.url);
       const path = url.pathname.split("/").pop();

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

       // Parse the request body
       const body = await req.json();

       // Route the request based on the path
       switch (path) {
         // Customer-facing endpoints
         case "create-payment-intent":
           return await handleCreatePaymentIntent(user, body, headers);
         case "create-customer":
           return await handleCreateCustomer(user, body, headers);
         case "create-subscription":
           return await handleCreateSubscription(user, body, headers);
         case "list-payment-methods":
           return await handleListPaymentMethods(user, headers);
         case "attach-payment-method":
           return await handleAttachPaymentMethod(user, body, headers);
         case "detach-payment-method":
           return await handleDetachPaymentMethod(user, body, headers);
         case "set-default-payment":
           return await handleSetDefaultPayment(user, body, headers);
         case "cancel-subscription":
           return await handleCancelSubscription(user, body, headers);
         case "list-invoices":
           return await handleListInvoices(user, body, headers);

         // Admin endpoints (require admin role)
         case "admin-list-customers":
           return await handleAdminListCustomers(user, body, headers);
         case "admin-list-subscriptions":
           return await handleAdminListSubscriptions(user, body, headers);
         case "admin-list-payments":
           return await handleAdminListPayments(user, body, headers);
         case "admin-list-invoices":
           return await handleAdminListInvoices(user, body, headers);
         case "admin-get-stripe-dashboard-link":
           return await handleAdminGetStripeDashboardLink(user, body, headers);
         default:
           return new Response(JSON.stringify({ error: "Not found" }), {
             headers,
             status: 404,
           });
       }
     } catch (error) {
       console.error("Error processing request:", error);
       return new Response(JSON.stringify({ error: error.message }), {
         headers,
         status: 500,
       });
     }
   });

   // Handler functions for customer-facing operations
   async function handleCreatePaymentIntent(user: User, body, headers) {
     // Implementation details
   }

   async function handleCreateCustomer(user: User, body, headers) {
     // Implementation details
   }

   async function handleCreateSubscription(user: User, body, headers) {
     // Implementation details
   }

   // Additional handler functions for payment methods, subscriptions, and invoices

   // Admin handler functions
   async function handleAdminListCustomers(user: User, body, headers) {
     // Implementation details with admin role check
   }

   // Additional admin handler functions

   // In supabase/functions/stripe-webhook/index.ts
   import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
   import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
   import Stripe from "https://esm.sh/stripe@12.4.0?dts";

   // Webhook handler to process Stripe events and update the database
   serve(async (req) => {
     try {
       // Verify webhook signature
       // Process events like payment_intent.succeeded, subscription.created, etc.
       // Update local database tables with Stripe data
     } catch (error) {
       // Error handling
     }
   });
   ```

## Currently working on

## Priority 3: Code Structure Improvements

### Task 3.1: Implement Dedicated Service Modules

**Subtasks:**

1. **Create a dedicated payment service module**

   - Create `lib/payment.ts` to handle all payment-related operations
   - Separate payment logic from booking logic
   - Implement proper error handling and retry mechanisms

2. **Refactor booking service**

   - Separate booking creation from payment processing
   - Implement proper state management for booking status transitions
   - Add validation for booking data

3. **Create a notification service**
   - Implement a dedicated service for handling notifications
   - Add support for different notification types (email, push, in-app)
   - Ensure notifications are sent for important events (booking confirmation, payment success/failure)

### Task 3.2: Implement Proper Error Handling

**Subtasks:**

1. **Create consistent error handling patterns**

   ```typescript
   // In lib/errors.ts
   export class AppError extends Error {
     public code: string;
     public httpStatus: number;

     constructor(message: string, code: string, httpStatus: number = 400) {
       super(message);
       this.code = code;
       this.httpStatus = httpStatus;
       this.name = "AppError";
     }
   }

   export class PaymentError extends AppError {
     constructor(message: string, code: string = "payment_error") {
       super(message, code, 400);
       this.name = "PaymentError";
     }
   }

   export function handleApiError(error: any) {
     console.error("API Error:", error);

     if (error instanceof AppError) {
       return { error: error.message, code: error.code };
     }

     return {
       error: "An unexpected error occurred",
       code: "unknown_error",
     };
   }
   ```

2. **Implement retry logic for network operations**

   ```typescript
   // In lib/utils.ts
   export async function withRetry<T>(
     fn: () => Promise<T>,
     maxRetries: number = 3,
     delay: number = 1000
   ): Promise<T> {
     let lastError: any;

     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       try {
         return await fn();
       } catch (error) {
         lastError = error;

         // Only retry for network errors or 5xx server errors
         if (!isRetryableError(error)) {
           throw error;
         }

         console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
         await new Promise((resolve) => setTimeout(resolve, delay));

         // Exponential backoff
         delay *= 2;
       }
     }

     throw lastError;
   }

   function isRetryableError(error: any): boolean {
     // Network errors
     if (
       error.message?.includes("network") ||
       error.message?.includes("timeout")
     ) {
       return true;
     }

     // Server errors (5xx)
     if (error.status >= 500 && error.status < 600) {
       return true;
     }

     return false;
   }
   ```

### Task 3.3: Refactor Existing Payment Components

**Subtasks:**

1. **Update PaymentManagement component**

   - Modify to display Stripe payment information
   - Add support for viewing Stripe payment details
   - Implement refund functionality using Stripe API

2. **Update payments.tsx screen**

   - Modify to fetch payment data from Stripe
   - Add support for filtering by payment status
   - Implement proper error handling for Stripe API calls

3. **Ensure consistency across payment interfaces**
   - Standardize payment status terminology
   - Create reusable payment UI components
   - Implement consistent styling for payment-related screens

### Task 3.4: Implement Stripe Customer Synchronization

**Subtasks:**

1. **Create database triggers for profile updates**

   - Create a PostgreSQL function and trigger to automatically update Stripe customer data when profiles change:

     ```sql
     -- First create the function that will be called by the trigger
     CREATE OR REPLACE FUNCTION sync_profile_to_stripe()
     RETURNS TRIGGER AS $$
     DECLARE
       stripe_customer_id text;
       customer_data json;
       response json;
     BEGIN
       -- Only proceed if there's a Stripe customer ID and relevant fields changed
       IF OLD.stripe_customer_id IS NOT NULL AND
          (OLD.email != NEW.email OR
           OLD.first_name != NEW.first_name OR
           OLD.last_name != NEW.last_name OR
           OLD.phone != NEW.phone OR
           OLD.address != NEW.address OR
           OLD.city != NEW.city OR
           OLD.state != NEW.state OR
           OLD.zip_code != NEW.zip_code) THEN

         -- Prepare customer data for update
         customer_data := json_build_object(
           'email', NEW.email,
           'name', concat(NEW.first_name, ' ', NEW.last_name),
           'phone', NEW.phone,
           'address', json_build_object(
             'line1', NEW.address,
             'city', NEW.city,
             'state', NEW.state,
             'postal_code', NEW.zip_code,
             'country', 'US'
           ),
           'metadata', json_build_object(
             'user_id', NEW.id,
             'updated_at', now()
           )
         );

         -- Update the customer in Stripe using the Foreign Data Wrapper
         UPDATE stripe.customers
         SET
           email = NEW.email,
           name = concat(NEW.first_name, ' ', NEW.last_name),
           phone = NEW.phone,
           address = customer_data->>'address',
           metadata = customer_data->>'metadata'
         WHERE id = OLD.stripe_customer_id;

         -- Log the sync operation
         INSERT INTO sync_logs (entity_type, entity_id, operation, status, details)
         VALUES ('profile', NEW.id, 'update', 'success', json_build_object(
           'stripe_customer_id', OLD.stripe_customer_id,
           'changes', json_build_object(
             'email', json_build_object('old', OLD.email, 'new', NEW.email),
             'name', json_build_object(
               'old', concat(OLD.first_name, ' ', OLD.last_name),
               'new', concat(NEW.first_name, ' ', NEW.last_name)
             )
           )
         ));
       END IF;

       RETURN NEW;
     EXCEPTION WHEN OTHERS THEN
       -- Log the error
       INSERT INTO sync_logs (entity_type, entity_id, operation, status, details)
       VALUES ('profile', NEW.id, 'update', 'error', json_build_object(
         'error', SQLERRM,
         'stripe_customer_id', OLD.stripe_customer_id
       ));

       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql;

     -- Create the trigger on the profiles table
     CREATE TRIGGER profile_update_sync_stripe
     AFTER UPDATE ON profiles
     FOR EACH ROW
     EXECUTE FUNCTION sync_profile_to_stripe();
     ```

   - Create a sync_logs table to track synchronization operations:

     ```sql
     -- Create a table to log sync operations
     CREATE TABLE IF NOT EXISTS sync_logs (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       entity_type TEXT NOT NULL,
       entity_id UUID NOT NULL,
       operation TEXT NOT NULL,
       status TEXT NOT NULL,
       details JSONB,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
     );

     -- Add index for faster queries
     CREATE INDEX IF NOT EXISTS idx_sync_logs_entity ON sync_logs(entity_type, entity_id);
     CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
     ```

2. **Implement webhook handlers for Stripe customer updates**

   - Add a handler for `customer.updated` events in your webhook Edge Function:

     ```typescript
     // In your webhook handler function, add this case
     case "customer.updated":
       return await handleCustomerUpdated(event.data.object);

     // Then implement the handler function
     async function handleCustomerUpdated(customer) {
       try {
         // Extract the user ID from metadata
         const userId = customer.metadata?.user_id;
         if (!userId) {
           console.log("No user ID found in customer metadata");
           return { success: false, error: "No user ID found" };
         }

         // Get the current profile data
         const { data: profile, error: profileError } = await supabase
           .from("profiles")
           .select("*")
           .eq("id", userId)
           .single();

         if (profileError) {
           console.error("Error fetching profile:", profileError);
           return { success: false, error: profileError.message };
         }

         // Check if the update came from our system
         if (customer.metadata?.updated_at) {
           const stripeUpdateTime = new Date(customer.metadata.updated_at).getTime();
           const profileUpdateTime = new Date(profile.updated_at).getTime();

           // If our profile was updated more recently than the Stripe update,
           // don't overwrite our data (prevents update loops)
           if (profileUpdateTime >= stripeUpdateTime) {
             return { success: true, skipped: true, reason: "Profile is more recent" };
           }
         }

         // Extract name parts
         let firstName = profile.first_name;
         let lastName = profile.last_name;

         if (customer.name) {
           const nameParts = customer.name.split(' ');
           if (nameParts.length > 0) {
             firstName = nameParts[0];
             lastName = nameParts.slice(1).join(' ');
           }
         }

         // Extract address parts
         const address = customer.address || {};

         // Update the profile with Stripe data
         const { error: updateError } = await supabase
           .from("profiles")
           .update({
             email: customer.email || profile.email,
             first_name: firstName,
             last_name: lastName,
             phone: customer.phone || profile.phone,
             address: address.line1 || profile.address,
             city: address.city || profile.city,
             state: address.state || profile.state,
             zip_code: address.postal_code || profile.zip_code,
             updated_at: new Date().toISOString(),
             // Add a flag to indicate this update came from Stripe
             metadata: { ...profile.metadata, updated_from_stripe: true }
           })
           .eq("id", userId);

         if (updateError) {
           console.error("Error updating profile:", updateError);
           return { success: false, error: updateError.message };
         }

         return { success: true };
       } catch (error) {
         console.error("Error handling customer update:", error);
         return { success: false, error: error.message };
       }
     }
     ```

3. **Add reconciliation process**

   - Create a scheduled Edge Function to verify customer data consistency:

     ```typescript
     // In supabase/functions/stripe-reconciliation/index.ts
     import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
     import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
     import Stripe from "https://esm.sh/stripe@12.4.0?dts";

     const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
     const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

     const stripe = new Stripe(stripeSecretKey, {
       apiVersion: "2023-10-16",
     });

     const supabase = createClient(supabaseUrl, supabaseServiceKey);

     serve(async (req) => {
       // Only allow POST requests with proper authorization
       if (req.method !== "POST") {
         return new Response(JSON.stringify({ error: "Method not allowed" }), {
           status: 405,
           headers: { "Content-Type": "application/json" },
         });
       }

       try {
         // Parse request body for options
         const { limit = 100, fix = false } = await req.json();

         // Get profiles with Stripe customer IDs
         const { data: profiles, error: profilesError } = await supabase
           .from("profiles")
           .select(
             "id, email, first_name, last_name, phone, stripe_customer_id, updated_at"
           )
           .not("stripe_customer_id", "is", null)
           .limit(limit);

         if (profilesError) {
           throw new Error(`Error fetching profiles: ${profilesError.message}`);
         }

         const results = {
           total: profiles.length,
           mismatches: 0,
           fixed: 0,
           errors: 0,
           details: [],
         };

         // Check each profile against Stripe
         for (const profile of profiles) {
           try {
             // Get customer from Stripe
             const customer = await stripe.customers.retrieve(
               profile.stripe_customer_id
             );

             if (customer.deleted) {
               results.details.push({
                 userId: profile.id,
                 issue: "Customer deleted in Stripe",
                 fixed: false,
               });
               results.mismatches++;
               continue;
             }

             // Check for mismatches
             const mismatches = [];

             if (customer.email !== profile.email) {
               mismatches.push({
                 field: "email",
                 stripe: customer.email,
                 local: profile.email,
               });
             }

             const fullName =
               `${profile.first_name} ${profile.last_name}`.trim();
             if (customer.name !== fullName) {
               mismatches.push({
                 field: "name",
                 stripe: customer.name,
                 local: fullName,
               });
             }

             if (customer.phone !== profile.phone && profile.phone) {
               mismatches.push({
                 field: "phone",
                 stripe: customer.phone,
                 local: profile.phone,
               });
             }

             // If mismatches found
             if (mismatches.length > 0) {
               results.mismatches++;

               const detail = {
                 userId: profile.id,
                 stripeCustomerId: profile.stripe_customer_id,
                 mismatches,
                 fixed: false,
               };

               // Fix mismatches if requested
               if (fix) {
                 try {
                   // Update Stripe with local data
                   await stripe.customers.update(profile.stripe_customer_id, {
                     email: profile.email,
                     name: fullName,
                     phone: profile.phone,
                     metadata: {
                       ...customer.metadata,
                       reconciled_at: new Date().toISOString(),
                     },
                   });

                   detail.fixed = true;
                   results.fixed++;
                 } catch (fixError) {
                   detail.fixError = fixError.message;
                 }
               }

               results.details.push(detail);
             }
           } catch (customerError) {
             results.errors++;
             results.details.push({
               userId: profile.id,
               stripeCustomerId: profile.stripe_customer_id,
               error: customerError.message,
             });
           }
         }

         // Log reconciliation results
         await supabase.from("reconciliation_logs").insert({
           type: "stripe_customer",
           results: results,
           created_at: new Date().toISOString(),
         });

         return new Response(JSON.stringify(results), {
           status: 200,
           headers: { "Content-Type": "application/json" },
         });
       } catch (error) {
         console.error("Reconciliation error:", error);

         return new Response(JSON.stringify({ error: error.message }), {
           status: 500,
           headers: { "Content-Type": "application/json" },
         });
       }
     });
     ```

   - Create a reconciliation_logs table to track reconciliation runs:

     ```sql
     -- Create a table to log reconciliation runs
     CREATE TABLE IF NOT EXISTS reconciliation_logs (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       type TEXT NOT NULL,
       results JSONB NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
     );

     -- Add index for faster queries
     CREATE INDEX IF NOT EXISTS idx_reconciliation_logs_type ON reconciliation_logs(type);
     CREATE INDEX IF NOT EXISTS idx_reconciliation_logs_created_at ON reconciliation_logs(created_at);
     ```

   - Set up a scheduled cron job to run the reconciliation process regularly:

     ```bash
     # Deploy the reconciliation function
     supabase functions deploy stripe-reconciliation --no-verify-jwt

     # Set up a scheduled job to run daily at 2 AM
     # You can use a service like GitHub Actions, AWS Lambda, or a dedicated cron service
     # Example cron expression: 0 2 * * *

     # The scheduled job should make a POST request to:
     # https://[YOUR_PROJECT_REF].supabase.co/functions/v1/stripe-reconciliation
     # with the following body:
     # { "limit": 500, "fix": true }
     ```

### Task 3.5: Implement Rate Limiting and Retry Logic

**Subtasks:**

1. **Create a rate limiting utility**

   - Implement a queue system for Stripe API calls to prevent hitting rate limits:

     ```typescript
     // In lib/stripe/rateLimiter.ts
     import { Queue } from "queue";

     // Create a queue with concurrency limit
     const stripeQueue = new Queue({ concurrency: 5 });

     // Add a job to the queue
     export function queueStripeRequest<T>(fn: () => Promise<T>): Promise<T> {
       return new Promise((resolve, reject) => {
         stripeQueue.push(async (cb) => {
           try {
             const result = await fn();
             resolve(result);
             cb(null, result);
           } catch (error) {
             // Check if it's a rate limit error
             if (error.type === "StripeRateLimitError") {
               console.warn("Stripe rate limit hit, backing off...");
               // Wait and retry after exponential backoff
               setTimeout(() => {
                 queueStripeRequest(fn).then(resolve).catch(reject);
               }, calculateBackoff(error.headers?.["retry-after"] || 1));
             } else {
               reject(error);
               cb(error);
             }
           }
         });
       });
     }

     // Calculate exponential backoff time
     function calculateBackoff(retryAfter: number | string): number {
       const baseDelay =
         typeof retryAfter === "string" ? parseInt(retryAfter, 10) : retryAfter;
       return baseDelay * 1000 + Math.random() * 1000; // Add jitter
     }

     // Usage example
     export async function createStripeCustomerWithRateLimit(data) {
       return queueStripeRequest(() => createStripeCustomer(data));
     }
     ```

   - Add logging for rate limit errors to identify patterns:

     ```typescript
     // In lib/stripe/logger.ts
     export function logRateLimitError(operation: string, error: any) {
       console.error(`Stripe rate limit hit during ${operation}`, {
         operation,
         status: error.statusCode,
         type: error.type,
         retryAfter: error.headers?.["retry-after"],
         timestamp: new Date().toISOString(),
       });

       // Also log to database for analysis
       supabase
         .from("stripe_rate_limit_logs")
         .insert({
           operation,
           status_code: error.statusCode,
           error_type: error.type,
           retry_after: error.headers?.["retry-after"],
           created_at: new Date().toISOString(),
         })
         .then(() => {})
         .catch((e) => console.error("Failed to log rate limit error", e));
     }
     ```

2. **Add circuit breaker pattern**

   - Implement a circuit breaker to prevent cascading failures:

     ```typescript
     // In lib/stripe/circuitBreaker.ts
     export class CircuitBreaker {
       private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
       private failureCount = 0;
       private successCount = 0;
       private lastFailureTime = 0;
       private readonly failureThreshold: number;
       private readonly resetTimeout: number;
       private readonly successThreshold: number;

       constructor(
         options: {
           failureThreshold?: number;
           resetTimeout?: number;
           successThreshold?: number;
         } = {}
       ) {
         this.failureThreshold = options.failureThreshold || 5;
         this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
         this.successThreshold = options.successThreshold || 2;
       }

       async execute<T>(
         fn: () => Promise<T>,
         fallback?: () => Promise<T>
       ): Promise<T> {
         if (this.state === "OPEN") {
           if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
             this.state = "HALF_OPEN";
           } else if (fallback) {
             return fallback();
           } else {
             throw new Error("Circuit is OPEN");
           }
         }

         try {
           const result = await fn();
           this.onSuccess();
           return result;
         } catch (error) {
           this.onFailure();
           if (fallback) {
             return fallback();
           }
           throw error;
         }
       }

       private onSuccess() {
         if (this.state === "HALF_OPEN") {
           this.successCount++;
           if (this.successCount >= this.successThreshold) {
             this.successCount = 0;
             this.failureCount = 0;
             this.state = "CLOSED";
           }
         }
       }

       private onFailure() {
         this.lastFailureTime = Date.now();
         this.failureCount++;
         if (
           this.state === "CLOSED" &&
           this.failureCount >= this.failureThreshold
         ) {
           this.state = "OPEN";
         } else if (this.state === "HALF_OPEN") {
           this.state = "OPEN";
         }
       }
     }

     // Create circuit breakers for different Stripe operations
     export const paymentCircuitBreaker = new CircuitBreaker();
     export const customerCircuitBreaker = new CircuitBreaker();
     export const subscriptionCircuitBreaker = new CircuitBreaker();

     // Usage example
     export async function createPaymentIntentWithCircuitBreaker(
       amount: number,
       customerId: string
     ) {
       return paymentCircuitBreaker.execute(
         () => createPaymentIntent(amount, customerId),
         // Fallback function that stores the payment request for later processing
         () => storePaymentRequestForLaterProcessing(amount, customerId)
       );
     }
     ```

   - Create a dashboard to monitor API usage and circuit breaker status:

     ```typescript
     // In app/components/admin/StripeMonitoringDashboard.tsx
     import React, { useState, useEffect } from "react";
     import { View, Text, StyleSheet } from "react-native";
     import { supabase } from "../../../lib/supabase";

     export default function StripeMonitoringDashboard() {
       const [rateLimitLogs, setRateLimitLogs] = useState([]);
       const [circuitStatus, setCircuitStatus] = useState({
         payment: "CLOSED",
         customer: "CLOSED",
         subscription: "CLOSED",
       });

       useEffect(() => {
         // Fetch rate limit logs
         fetchRateLimitLogs();

         // Set up polling for circuit breaker status
         const interval = setInterval(() => {
           // In a real app, you would fetch this from a service
           // For demo purposes, we're just using mock data
           setCircuitStatus({
             payment: paymentCircuitBreaker.state,
             customer: customerCircuitBreaker.state,
             subscription: subscriptionCircuitBreaker.state,
           });
         }, 5000);

         return () => clearInterval(interval);
       }, []);

       const fetchRateLimitLogs = async () => {
         const { data, error } = await supabase
           .from("stripe_rate_limit_logs")
           .select("*")
           .order("created_at", { ascending: false })
           .limit(10);

         if (!error && data) {
           setRateLimitLogs(data);
         }
       };

       return (
         <View style={styles.container}>
           <Text style={styles.title}>Stripe API Monitoring</Text>

           <View style={styles.section}>
             <Text style={styles.sectionTitle}>Circuit Breaker Status</Text>
             <View style={styles.statusContainer}>
               <View style={styles.statusItem}>
                 <Text>Payment:</Text>
                 <Text style={getStatusStyle(circuitStatus.payment)}>
                   {circuitStatus.payment}
                 </Text>
               </View>
               <View style={styles.statusItem}>
                 <Text>Customer:</Text>
                 <Text style={getStatusStyle(circuitStatus.customer)}>
                   {circuitStatus.customer}
                 </Text>
               </View>
               <View style={styles.statusItem}>
                 <Text>Subscription:</Text>
                 <Text style={getStatusStyle(circuitStatus.subscription)}>
                   {circuitStatus.subscription}
                 </Text>
               </View>
             </View>
           </View>

           <View style={styles.section}>
             <Text style={styles.sectionTitle}>Recent Rate Limit Events</Text>
             {rateLimitLogs.length > 0 ? (
               rateLimitLogs.map((log, index) => (
                 <View key={index} style={styles.logItem}>
                   <Text>{new Date(log.created_at).toLocaleString()}</Text>
                   <Text>Operation: {log.operation}</Text>
                   <Text>Retry After: {log.retry_after || "N/A"}</Text>
                 </View>
               ))
             ) : (
               <Text>No rate limit events recorded</Text>
             )}
           </View>
         </View>
       );
     }

     const getStatusStyle = (status) => {
       switch (status) {
         case "OPEN":
           return { color: "red" };
         case "HALF_OPEN":
           return { color: "orange" };
         case "CLOSED":
           return { color: "green" };
         default:
           return {};
       }
     };

     const styles = StyleSheet.create({
       container: {
         padding: 16,
       },
       title: {
         fontSize: 20,
         fontWeight: "bold",
         marginBottom: 16,
       },
       section: {
         marginBottom: 24,
       },
       sectionTitle: {
         fontSize: 16,
         fontWeight: "bold",
         marginBottom: 8,
       },
       statusContainer: {
         backgroundColor: "#f5f5f5",
         padding: 12,
         borderRadius: 8,
       },
       statusItem: {
         flexDirection: "row",
         justifyContent: "space-between",
         marginBottom: 8,
       },
       logItem: {
         backgroundColor: "#f5f5f5",
         padding: 12,
         borderRadius: 8,
         marginBottom: 8,
       },
     });
     ```

## Priority 4: Client-Side Stripe Integration

### Task 4.1: Install Required Dependencies

**Subtasks:**

1. **Add Stripe React Native SDK**

   ```bash
   npm install @stripe/stripe-react-native
   ```

2. **Install additional dependencies**

   ```bash
   # For iOS
   cd ios && pod install && cd ..

   # For secure storage
   npm install @react-native-async-storage/async-storage expo-secure-store
   ```

3. **Update app configuration**

   - Add Stripe configuration to your `.env` file:

     ```env
     EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
     STRIPE_SECRET_KEY=sk_test_your_key
     STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
     ```

   - Update `app.config.js` to include Stripe keys:

     ```javascript
     extra: {
       supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
       supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
       stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
     }
     ```

### Task 4.2: Update App Layout with Stripe Provider

**Subtasks:**

1. **Modify app/\_layout.tsx**

   - Add StripeProvider at the root level to ensure it's available throughout the app
   - Ensure it wraps all role-specific layouts

   ```tsx
   import { StripeProvider } from "@stripe/stripe-react-native";
   import Constants from "expo-constants";

   export default function RootLayout() {
     return (
       <AuthProvider>
         <StripeProvider
           publishableKey={
             Constants.expoConfig?.extra?.stripePublishableKey || ""
           }
           merchantIdentifier="merchant.com.lawnrefresh"
           urlScheme="lawnrefresh" // For return URL handling
         >
           <ThemeProvider value={DefaultTheme}>
             {/* Rest of your app */}
           </ThemeProvider>
         </StripeProvider>
       </AuthProvider>
     );
   }
   ```

2. **Update role-specific layouts if necessary**

   - Ensure Stripe functionality is properly passed down to role-specific components
   - Add any role-specific Stripe UI elements or functionality

3. **Set up URL handling for 3D Secure authentication**

   - Add to `app/_layout.tsx`:

     ```tsx
     import { useEffect } from "react";
     import { Linking } from "react-native";
     import { useStripe } from "@stripe/stripe-react-native";

     // Inside the RootLayout component
     const { handleURLCallback } = useStripe();

     useEffect(() => {
       const handleDeepLink = async (url: string) => {
         if (url && url.startsWith("lawnrefresh://")) {
           await handleURLCallback(url);
         }
       };

       // Handle deep links when the app is already open
       const subscription = Linking.addEventListener("url", ({ url }) => {
         handleDeepLink(url);
       });

       // Handle deep links when the app is opened from a deep link
       Linking.getInitialURL().then((url) => {
         if (url) {
           handleDeepLink(url);
         }
       });

       return () => {
         subscription.remove();
       };
     }, [handleURLCallback]);
     ```

## Priority 5: Server-Side Stripe Integration

### Task 5.1: Deploy Supabase Edge Functions for Stripe Operations

**Subtasks:**

1. **Complete the implementation of the Edge Functions**

   - Finish implementing all handler functions in `supabase/functions/stripe-api/index.ts`
   - Implement webhook event processing in `supabase/functions/stripe-webhook/index.ts`
   - Add proper error handling and logging

2. **Test the Edge Functions locally**

   ```bash
   supabase start
   supabase functions serve
   ```

3. **Deploy the Edge Functions**

   ```bash
   supabase functions deploy stripe-api --use-api
   supabase functions deploy stripe-webhook --use-api
   ```

### Task 5.2: Create Stripe Products and Prices

**Subtasks:**

1. **Create products for your services**

   - Use the Stripe MCP to create products for each service
   - Update your services table with Stripe product IDs

2. **Create prices for your products**

   - Use the Stripe MCP to create prices for each product
   - Update your services table with Stripe price IDs

3. **Create subscription prices for recurring plans**
   - Use the Stripe MCP to create subscription prices
   - Update your recurring_plans table with Stripe price IDs

### Task 5.3: Implement Robust Webhook Handling

**Subtasks:**

1. **Enhance the webhook handler**

   - Improve the existing webhook handler in `supabase/functions/stripe-webhook/index.ts`
   - Implement the following structure for the webhook handler:

     ```typescript
     import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
     import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
     import Stripe from "https://esm.sh/stripe@12.4.0?dts";

     const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
     const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

     const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
       apiVersion: "2023-10-16",
     });

     const supabase = createClient(supabaseUrl, supabaseServiceKey);

     serve(async (req) => {
       if (req.method === "POST") {
         // Verify Stripe webhook signature to prevent webhook spoofing
         const stripeSignature = req.headers.get("stripe-signature");
         if (!stripeSignature) {
           console.error("No Stripe signature provided");
           return new Response(
             JSON.stringify({ error: "No signature provided" }),
             {
               status: 400,
               headers: { "Content-Type": "application/json" },
             }
           );
         }

         let event;
         try {
           // Get the raw request body and verify the webhook signature
           const payload = await req.text();
           event = stripe.webhooks.constructEvent(
             payload,
             stripeSignature,
             stripeWebhookSecret
           );

           // Log successful verification
           console.log(`Webhook verified: ${event.type}`);

           // Process the verified event based on its type
           const result = await handleStripeEvent(event);

           return new Response(JSON.stringify(result), {
             status: 200,
             headers: { "Content-Type": "application/json" },
           });
         } catch (err) {
           // Log signature verification failures specifically
           if (err.message.includes("signature")) {
             console.error(
               `Webhook signature verification failed: ${err.message}`
             );
           } else {
             console.error(`Webhook Error: ${err.message}`);
           }

           return new Response(JSON.stringify({ error: err.message }), {
             status: 400,
             headers: { "Content-Type": "application/json" },
           });
         }
       }

       return new Response(JSON.stringify({ error: "Method not allowed" }), {
         status: 405,
         headers: { "Content-Type": "application/json" },
       });
     });

     async function handleStripeEvent(event) {
       // Event handlers will be implemented in the next subtask
       // This is just the skeleton
       switch (event.type) {
         case "payment_intent.succeeded":
           return await handlePaymentIntentSucceeded(event.data.object);
         case "payment_intent.payment_failed":
           return await handlePaymentIntentFailed(event.data.object);
         case "invoice.paid":
           return await handleInvoicePaid(event.data.object);
         case "customer.subscription.updated":
           return await handleSubscriptionUpdated(event.data.object);
         default:
           console.log(`Unhandled event type: ${event.type}`);
           return { received: true, handled: false, eventType: event.type };
       }
     }
     ```

   - Ensure the webhook endpoint is secured with proper signature verification using the `stripe-signature` header
   - Configure the webhook endpoint in Supabase to be publicly accessible without JWT verification using the `--no-verify-jwt` flag

2. **Implement webhook event handlers**

   - Create the following handler functions in the webhook Edge Function:

     ```typescript
     async function handlePaymentIntentSucceeded(paymentIntent) {
       // Extract booking ID from metadata
       const bookingId = paymentIntent.metadata?.booking_id;
       if (!bookingId) {
         console.log("No booking ID found in payment intent metadata");
         return { success: false, error: "No booking ID found" };
       }

       // Update booking status to 'scheduled'
       const { data, error } = await supabase
         .from("bookings")
         .update({
           status: "scheduled",
           // Store the payment details for reference
           stripe_payment_intent_id: paymentIntent.id,
           updated_at: new Date().toISOString(),
         })
         .eq("id", bookingId);

       if (error) {
         console.error("Error updating booking status:", error);
         return { success: false, error: error.message };
       }

       // Create a notification for the customer
       await createNotification(bookingId, "payment_processed");

       return { success: true, bookingId };
     }

     async function handlePaymentIntentFailed(paymentIntent) {
       const bookingId = paymentIntent.metadata?.booking_id;
       if (!bookingId) {
         return { success: false, error: "No booking ID found" };
       }

       // Update booking status to reflect payment failure
       const { error } = await supabase
         .from("bookings")
         .update({
           status: "payment_failed",
           stripe_payment_intent_id: paymentIntent.id,
           updated_at: new Date().toISOString(),
         })
         .eq("id", bookingId);

       if (error) {
         console.error("Error updating booking status:", error);
         return { success: false, error: error.message };
       }

       // Create a notification for the customer about payment failure
       await createNotification(
         bookingId,
         "payment_failed",
         `Payment failed: ${
           paymentIntent.last_payment_error?.message || "Unknown error"
         }`
       );

       return { success: true, bookingId };
     }

     async function handleInvoicePaid(invoice) {
       // For subscription payments
       const subscriptionId = invoice.subscription;
       if (!subscriptionId) {
         return { success: false, error: "No subscription ID found" };
       }

       // Find bookings with this subscription ID
       const { data: bookings, error } = await supabase
         .from("bookings")
         .select("id, customer_id")
         .eq("stripe_subscription_id", subscriptionId);

       if (error || !bookings?.length) {
         console.error(
           "Error finding bookings for subscription:",
           error || "No bookings found"
         );
         return {
           success: false,
           error: error?.message || "No bookings found",
         };
       }

       // Update all bookings associated with this subscription
       for (const booking of bookings) {
         await supabase
           .from("bookings")
           .update({
             status: "scheduled",
             updated_at: new Date().toISOString(),
           })
           .eq("id", booking.id);

         // Create a notification for the customer
         await createNotification(booking.id, "subscription_payment_processed");
       }

       return { success: true, bookingsUpdated: bookings.length };
     }

     async function handleSubscriptionUpdated(subscription) {
       // Handle subscription status changes
       const status = subscription.status;
       const subscriptionId = subscription.id;

       // Find bookings with this subscription ID
       const { data: bookings, error } = await supabase
         .from("bookings")
         .select("id, customer_id")
         .eq("stripe_subscription_id", subscriptionId);

       if (error || !bookings?.length) {
         console.error(
           "Error finding bookings for subscription:",
           error || "No bookings found"
         );
         return {
           success: false,
           error: error?.message || "No bookings found",
         };
       }

       // Map Stripe subscription status to booking status
       let bookingStatus;
       switch (status) {
         case "active":
           bookingStatus = "scheduled";
           break;
         case "past_due":
           bookingStatus = "payment_pending";
           break;
         case "canceled":
           bookingStatus = "cancelled";
           break;
         case "unpaid":
           bookingStatus = "payment_failed";
           break;
         default:
           bookingStatus = "pending";
       }

       // Update all bookings associated with this subscription
       for (const booking of bookings) {
         await supabase
           .from("bookings")
           .update({
             status: bookingStatus,
             updated_at: new Date().toISOString(),
           })
           .eq("id", booking.id);

         // Create a notification for the customer
         await createNotification(
           booking.id,
           "subscription_updated",
           `Your subscription status is now: ${status}`
         );
       }

       return {
         success: true,
         bookingsUpdated: bookings.length,
         newStatus: status,
       };
     }

     async function createNotification(bookingId, type, message = null) {
       // First get the booking to find the customer
       const { data: booking, error: bookingError } = await supabase
         .from("bookings")
         .select("customer_id, service_id")
         .eq("id", bookingId)
         .single();

       if (bookingError || !booking) {
         console.error(
           "Error finding booking for notification:",
           bookingError || "No booking found"
         );
         return false;
       }

       // Get service name for the notification
       const { data: service, error: serviceError } = await supabase
         .from("services")
         .select("name")
         .eq("id", booking.service_id)
         .single();

       const serviceName = service?.name || "service";

       // Prepare notification content based on type
       let title, content;
       switch (type) {
         case "payment_processed":
           title = "Payment Successful";
           content =
             message ||
             `Your payment for ${serviceName} has been processed successfully.`;
           break;
         case "payment_failed":
           title = "Payment Failed";
           content =
             message ||
             `Your payment for ${serviceName} could not be processed. Please update your payment method.`;
           break;
         case "subscription_payment_processed":
           title = "Subscription Payment Processed";
           content =
             message ||
             `Your subscription payment for ${serviceName} has been processed successfully.`;
           break;
         case "subscription_updated":
           title = "Subscription Updated";
           content =
             message ||
             `Your subscription for ${serviceName} has been updated.`;
           break;
         default:
           title = "Booking Update";
           content =
             message ||
             `There has been an update to your ${serviceName} booking.`;
       }

       // Create the notification
       const { error: notificationError } = await supabase
         .from("notifications")
         .insert({
           user_id: booking.customer_id,
           type,
           title,
           message: content,
           data: { booking_id: bookingId },
           is_read: false,
           created_at: new Date().toISOString(),
         });

       if (notificationError) {
         console.error("Error creating notification:", notificationError);
         return false;
       }

       return true;
     }
     ```

   - Ensure each handler properly updates the database and creates appropriate notifications
   - Implement error handling and logging for each webhook event type
   - Make sure to handle edge cases like missing metadata or invalid booking IDs

3. **Configure webhook events in Stripe Dashboard**
   - In the Stripe Dashboard, go to Developers > Webhooks
   - Add your production webhook endpoint URL: `https://[YOUR_PROJECT_REF].supabase.co/functions/v1/stripe-webhook`
   - Select the following events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy the webhook signing secret and store it securely in your environment variables
   - Verify the webhook is properly configured by checking the webhook details page

## Priority 6: UI Improvements and Payment Flow

### Task 6.1: Update BookingForm Component

**Subtasks:**

1. **Modify BookingForm to use Stripe's PaymentSheet**

   - Update the `BookingForm.tsx` component to integrate Stripe's PaymentSheet:

     ```typescript
     // In app/components/customer/BookingForm.tsx
     import { PaymentSheet, useStripe } from "@stripe/stripe-react-native";
     import { useState, useEffect } from "react";

     // Inside your component
     const { initPaymentSheet, presentPaymentSheet } = useStripe();
     const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
     const [paymentInProgress, setPaymentInProgress] = useState(false);
     const [paymentError, setPaymentError] = useState<string | null>(null);

     // Function to initialize the payment sheet
     const initializePaymentSheet = async (bookingData) => {
       try {
         setPaymentInProgress(true);
         setPaymentError(null);

         // First create the booking in pending status
         const booking = await createBookingInDatabase(bookingData, "pending");

         // Get a payment intent from your Supabase Edge Function
         const response = await fetch(
           `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-functions/create-payment-intent`,
           {
             method: "POST",
             headers: {
               "Content-Type": "application/json",
               Authorization: `Bearer ${session?.access_token}`,
             },
             body: JSON.stringify({
               amount: Math.round(bookingData.price * 100), // Convert to cents
               bookingId: booking.id,
             }),
           }
         );

         const {
           clientSecret,
           paymentIntentId,
           error: apiError,
         } = await response.json();

         if (apiError) {
           throw new Error(apiError);
         }

         // Update booking with payment intent ID
         await supabase
           .from("bookings")
           .update({ stripe_payment_intent_id: paymentIntentId })
           .eq("id", booking.id);

         // Initialize the payment sheet
         const { error } = await initPaymentSheet({
           paymentIntentClientSecret: clientSecret,
           merchantDisplayName: "RefreshLawn",
           defaultBillingDetails: {
             name: `${user.first_name} ${user.last_name}`.trim(),
             email: user.email,
             address: {
               city: user.city || "",
               country: "US",
               line1: user.address || "",
               postalCode: user.zip_code || "",
               state: user.state || "",
             },
           },
           applePay: { merchantCountryCode: "US" },
           googlePay: {
             merchantCountryCode: "US",
             testEnv: process.env.NODE_ENV !== "production",
           },
           allowsDelayedPaymentMethods: false,
           appearance: {
             colors: {
               primary: "#10b981", // Match your app's theme color
               background: "#ffffff",
               componentBackground: "#f3f4f6",
               componentBorder: "#e5e7eb",
               componentDivider: "#e5e7eb",
               primaryText: "#111827",
               secondaryText: "#6b7280",
               componentText: "#111827",
               placeholderText: "#9ca3af",
             },
             shapes: {
               borderRadius: 8,
             },
           },
         });

         if (error) {
           throw new Error(error.message);
         }

         setPaymentSheetEnabled(true);
         return booking.id;
       } catch (error) {
         console.error("Error initializing payment sheet:", error);
         setPaymentError(getPaymentErrorMessage(error));
         setPaymentSheetEnabled(false);
         return null;
       } finally {
         setPaymentInProgress(false);
       }
     };

     // Function to present the payment sheet
     const handlePayment = async (bookingId) => {
       try {
         setPaymentInProgress(true);
         setPaymentError(null);

         // Present the payment sheet
         const { error } = await presentPaymentSheet();

         if (error) {
           // Handle payment cancellation or failure
           console.error("Payment failed:", error);

           // Update booking status based on error type
           if (error.code === "Canceled") {
             // User canceled the payment - keep booking as pending
             return { success: false, canceled: true, bookingId };
           } else {
             // Payment failed due to an error
             await supabase
               .from("bookings")
               .update({ status: "payment_failed" })
               .eq("id", bookingId);

             setPaymentError(getPaymentErrorMessage(error));
             return { success: false, error, bookingId };
           }
         }

         // Payment successful - booking status will be updated by webhook
         // But we can show success UI immediately
         return { success: true, bookingId };
       } catch (error) {
         console.error("Error processing payment:", error);
         setPaymentError(getPaymentErrorMessage(error));
         return { success: false, error, bookingId };
       } finally {
         setPaymentInProgress(false);
       }
     };

     // Helper function to create booking in database
     const createBookingInDatabase = async (
       bookingData,
       status = "pending"
     ) => {
       const { data, error } = await supabase
         .from("bookings")
         .insert({
           customer_id: user.id,
           service_id: bookingData.serviceId,
           recurring_plan_id: bookingData.isRecurring
             ? bookingData.recurringPlanId
             : null,
           status,
           price: bookingData.price,
           scheduled_date: bookingData.date,
           scheduled_time: bookingData.time,
           address: bookingData.address,
           notes: bookingData.notes || "",
         })
         .select()
         .single();

       if (error) throw error;
       return data;
     };

     // Function to get user-friendly error messages
     const getPaymentErrorMessage = (error) => {
       // Map Stripe error codes to user-friendly messages
       const errorMessages = {
         card_declined:
           "Your card was declined. Please try a different payment method.",
         expired_card: "Your card has expired. Please use a different card.",
         incorrect_cvc:
           "The security code (CVC) is incorrect. Please check and try again.",
         insufficient_funds:
           "Your card has insufficient funds. Please use a different payment method.",
         processing_error:
           "An error occurred while processing your card. Please try again later.",
         Canceled: "Payment was canceled. You can try again when you're ready.",
         // Add more error mappings as needed
       };

       const errorCode = error.code || error.decline_code || "unknown";
       return (
         errorMessages[errorCode] ||
         error.message ||
         "An unexpected error occurred. Please try again or contact support."
       );
     };
     ```

   - Add UI components for payment states (loading, success, error) in the BookingForm:

     ```jsx
     {
       /* Payment loading state */
     }
     {
       paymentInProgress && (
         <View className="p-4 bg-gray-50 rounded-lg mb-4 items-center">
           <ActivityIndicator size="large" color="#10b981" />
           <Text className="mt-2 text-gray-700">
             Processing your payment...
           </Text>
         </View>
       );
     }

     {
       /* Payment error state */
     }
     {
       paymentError && (
         <View className="p-4 bg-red-50 rounded-lg mb-4">
           <Text className="text-red-700 font-medium">Payment Error</Text>
           <Text className="text-red-600 mt-1">{paymentError}</Text>
           <TouchableOpacity
             className="mt-3 bg-white border border-red-300 rounded-md py-2 px-4 self-start"
             onPress={() => setPaymentError(null)}
           >
             <Text className="text-red-600">Try Again</Text>
           </TouchableOpacity>
         </View>
       );
     }

     {
       /* Payment button */
     }
     <TouchableOpacity
       className={`py-3 px-4 rounded-lg ${
         paymentSheetEnabled ? "bg-green-600" : "bg-gray-400"
       }`}
       disabled={!paymentSheetEnabled || paymentInProgress}
       onPress={async () => {
         const result = await handlePayment(bookingId);
         if (result.success) {
           // Show success message and navigate
           Alert.alert(
             "Payment Successful",
             "Your booking has been confirmed!",
             [
               {
                 text: "OK",
                 onPress: () => router.replace("/(customer)/dashboard"),
               },
             ]
           );
         } else if (!result.canceled) {
           // Error already displayed via paymentError state
         }
       }}
     >
       <Text className="text-white text-center font-medium">
         {paymentInProgress ? "Processing..." : "Pay Now"}
       </Text>
     </TouchableOpacity>;
     ```

   - Implement comprehensive error logging for payment failures:

     ```typescript
     // Add this to your component
     const logPaymentError = async (error, bookingId, userId) => {
       try {
         // Log to your backend or analytics service
         await supabase.from("error_logs").insert({
           user_id: userId,
           booking_id: bookingId,
           error_type: "payment_error",
           error_code: error.code || error.decline_code || "unknown",
           error_message: error.message || "No message provided",
           error_details: JSON.stringify(error),
           created_at: new Date().toISOString(),
         });
       } catch (logError) {
         // Fallback to console if logging fails
         console.error("Failed to log payment error:", logError);
         console.error("Original error:", error);
       }
     };
     ```

2. **Add payment method selection**

   - Implement a component to display and select saved payment methods:

     ```typescript
     // In app/components/customer/PaymentMethodSelector.tsx
     import React, { useState, useEffect } from "react";
     import {
       View,
       Text,
       TouchableOpacity,
       ActivityIndicator,
       Image,
     } from "react-native";
     import { supabase } from "../../../lib/supabase";
     import { CreditCard, PlusCircle } from "lucide-react-native";

     interface PaymentMethod {
       id: string;
       card_last4: string;
       card_brand: string;
       is_default: boolean;
     }

     interface PaymentMethodSelectorProps {
       userId: string;
       onSelectPaymentMethod: (paymentMethodId: string | null) => void;
       onAddNewPaymentMethod: () => void;
     }

     export default function PaymentMethodSelector({
       userId,
       onSelectPaymentMethod,
       onAddNewPaymentMethod,
     }: PaymentMethodSelectorProps) {
       const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
         []
       );
       const [selectedId, setSelectedId] = useState<string | null>(null);
       const [loading, setLoading] = useState(true);

       useEffect(() => {
         fetchPaymentMethods();
       }, []);

       const fetchPaymentMethods = async () => {
         try {
           setLoading(true);
           const { data, error } = await supabase
             .from("payment_methods")
             .select("*")
             .eq("customer_id", userId)
             .order("is_default", { ascending: false });

           if (error) throw error;

           setPaymentMethods(data || []);

           // Select default payment method if available
           const defaultMethod = data?.find((method) => method.is_default);
           if (defaultMethod) {
             setSelectedId(defaultMethod.id);
             onSelectPaymentMethod(defaultMethod.id);
           } else if (data && data.length > 0) {
             setSelectedId(data[0].id);
             onSelectPaymentMethod(data[0].id);
           } else {
             setSelectedId(null);
             onSelectPaymentMethod(null);
           }
         } catch (error) {
           console.error("Error fetching payment methods:", error);
         } finally {
           setLoading(false);
         }
       };

       const handleSelectPaymentMethod = (id: string) => {
         setSelectedId(id);
         onSelectPaymentMethod(id);
       };

       // Get card brand logo
       const getCardBrandLogo = (brand: string) => {
         switch (brand.toLowerCase()) {
           case "visa":
             return require("../../../assets/images/visa.png");
           case "mastercard":
             return require("../../../assets/images/mastercard.png");
           case "amex":
             return require("../../../assets/images/amex.png");
           case "discover":
             return require("../../../assets/images/discover.png");
           default:
             return null;
         }
       };

       if (loading) {
         return (
           <View className="p-4 items-center justify-center">
             <ActivityIndicator size="small" color="#10b981" />
             <Text className="mt-2 text-gray-500">
               Loading payment methods...
             </Text>
           </View>
         );
       }

       return (
         <View className="mb-4">
           <Text className="text-gray-700 font-medium mb-2">
             Payment Method
           </Text>

           {paymentMethods.length > 0 ? (
             <View>
               {paymentMethods.map((method) => (
                 <TouchableOpacity
                   key={method.id}
                   className={`flex-row items-center p-3 border rounded-lg mb-2 ${
                     selectedId === method.id
                       ? "border-green-500 bg-green-50"
                       : "border-gray-300"
                   }`}
                   onPress={() => handleSelectPaymentMethod(method.id)}
                 >
                   {method.card_brand && getCardBrandLogo(method.card_brand) ? (
                     <Image
                       source={getCardBrandLogo(method.card_brand)}
                       style={{ width: 40, height: 25 }}
                       resizeMode="contain"
                     />
                   ) : (
                     <CreditCard size={24} color="#6b7280" />
                   )}
                   <View className="ml-3">
                     <Text className="text-gray-800">
                       {method.card_brand} •••• {method.card_last4}
                     </Text>
                     {method.is_default && (
                       <Text className="text-xs text-gray-500">Default</Text>
                     )}
                   </View>
                 </TouchableOpacity>
               ))}
             </View>
           ) : (
             <View className="p-4 bg-gray-50 rounded-lg mb-2">
               <Text className="text-gray-600 text-center">
                 No saved payment methods
               </Text>
             </View>
           )}

           <TouchableOpacity
             className="flex-row items-center p-3 border border-dashed border-gray-300 rounded-lg"
             onPress={onAddNewPaymentMethod}
           >
             <PlusCircle size={24} color="#10b981" />
             <Text className="ml-3 text-green-600">Add new payment method</Text>
           </TouchableOpacity>
         </View>
       );
     }
     ```

   - Add support for Apple Pay and Google Pay by configuring the PaymentSheet options:

     ```typescript
     // In your payment initialization function
     const { error } = await initPaymentSheet({
       paymentIntentClientSecret: clientSecret,
       merchantDisplayName: "RefreshLawn",
       // Enable Apple Pay
       applePay: {
         merchantCountryCode: "US",
         merchantIdentifier: "merchant.com.refreshlawn", // Get this from your Apple Developer account
       },
       // Enable Google Pay
       googlePay: {
         merchantCountryCode: "US",
         testEnv: process.env.NODE_ENV !== "production", // Use test environment in development
         merchantName: "RefreshLawn",
       },
       // Other options...
     });
     ```

3. **Implement subscription selection**

   - Create a component for selecting between one-time and recurring payments:

     ```typescript
     // In app/components/customer/SubscriptionSelector.tsx
     import React, { useState, useEffect } from "react";
     import {
       View,
       Text,
       TouchableOpacity,
       ActivityIndicator,
     } from "react-native";
     import { supabase } from "../../../lib/supabase";
     import { Check, Clock } from "lucide-react-native";

     interface RecurringPlan {
       id: string;
       name: string;
       frequency: string;
       discount_percentage: number;
       description: string;
     }

     interface SubscriptionSelectorProps {
       serviceId: string;
       basePrice: number;
       onSelectPlan: (
         isRecurring: boolean,
         planId: string | null,
         finalPrice: number
       ) => void;
     }

     export default function SubscriptionSelector({
       serviceId,
       basePrice,
       onSelectPlan,
     }: SubscriptionSelectorProps) {
       const [recurringPlans, setRecurringPlans] = useState<RecurringPlan[]>(
         []
       );
       const [isRecurring, setIsRecurring] = useState(false);
       const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
         null
       );
       const [loading, setLoading] = useState(true);

       useEffect(() => {
         fetchRecurringPlans();
       }, []);

       const fetchRecurringPlans = async () => {
         try {
           setLoading(true);
           const { data, error } = await supabase
             .from("recurring_plans")
             .select("*")
             .order("discount_percentage", { ascending: false });

           if (error) throw error;

           setRecurringPlans(data || []);
         } catch (error) {
           console.error("Error fetching recurring plans:", error);
         } finally {
           setLoading(false);
         }
       };

       const handleSelectOneTime = () => {
         setIsRecurring(false);
         setSelectedPlanId(null);
         onSelectPlan(false, null, basePrice);
       };

       const handleSelectPlan = (planId: string, discount: number) => {
         setIsRecurring(true);
         setSelectedPlanId(planId);

         // Calculate discounted price
         const discountedPrice = basePrice * (1 - discount / 100);
         onSelectPlan(true, planId, discountedPrice);
       };

       // Format currency
       const formatCurrency = (amount: number) => {
         return `$${amount.toFixed(2)}`;
       };

       if (loading) {
         return (
           <View className="p-4 items-center justify-center">
             <ActivityIndicator size="small" color="#10b981" />
             <Text className="mt-2 text-gray-500">Loading plans...</Text>
           </View>
         );
       }

       return (
         <View className="mb-4">
           <Text className="text-gray-700 font-medium mb-2">
             Service Frequency
           </Text>

           {/* One-time option */}
           <TouchableOpacity
             className={`p-4 border rounded-lg mb-3 ${
               !isRecurring ? "border-green-500 bg-green-50" : "border-gray-300"
             }`}
             onPress={handleSelectOneTime}
           >
             <View className="flex-row justify-between items-center">
               <View className="flex-row items-center">
                 {!isRecurring && (
                   <Check size={20} color="#10b981" className="mr-2" />
                 )}
                 <Text
                   className={`font-medium ${
                     !isRecurring ? "text-green-700" : "text-gray-700"
                   }`}
                 >
                   One-time service
                 </Text>
               </View>
               <Text className="font-bold text-gray-800">
                 {formatCurrency(basePrice)}
               </Text>
             </View>
           </TouchableOpacity>

           {/* Recurring plans */}
           {recurringPlans.map((plan) => {
             const discountedPrice =
               basePrice * (1 - plan.discount_percentage / 100);
             const isSelected = isRecurring && selectedPlanId === plan.id;

             return (
               <TouchableOpacity
                 key={plan.id}
                 className={`p-4 border rounded-lg mb-3 ${
                   isSelected
                     ? "border-green-500 bg-green-50"
                     : "border-gray-300"
                 }`}
                 onPress={() =>
                   handleSelectPlan(plan.id, plan.discount_percentage)
                 }
               >
                 <View className="flex-row justify-between items-center">
                   <View className="flex-row items-center">
                     {isSelected && (
                       <Check size={20} color="#10b981" className="mr-2" />
                     )}
                     <View>
                       <Text
                         className={`font-medium ${
                           isSelected ? "text-green-700" : "text-gray-700"
                         }`}
                       >
                         {plan.name}
                       </Text>
                       <View className="flex-row items-center mt-1">
                         <Clock size={14} color="#6b7280" />
                         <Text className="text-xs text-gray-500 ml-1">
                           {plan.frequency}
                         </Text>
                       </View>
                     </View>
                   </View>
                   <View className="items-end">
                     <Text className="font-bold text-gray-800">
                       {formatCurrency(discountedPrice)}
                     </Text>
                     {plan.discount_percentage > 0 && (
                       <View className="flex-row items-center">
                         <Text className="text-xs text-gray-500 line-through mr-1">
                           {formatCurrency(basePrice)}
                         </Text>
                         <View className="bg-green-100 px-1 rounded">
                           <Text className="text-xs text-green-700">
                             Save {plan.discount_percentage}%
                           </Text>
                         </View>
                       </View>
                     )}
                   </View>
                 </View>
                 {plan.description && (
                   <Text className="text-xs text-gray-600 mt-2">
                     {plan.description}
                   </Text>
                 )}
               </TouchableOpacity>
             );
           })}
         </View>
       );
     }
     ```

   - Integrate the subscription selector into the BookingForm and update the payment flow to handle subscriptions:

     ```typescript
     // In BookingForm.tsx

     // Add state for subscription
     const [isRecurring, setIsRecurring] = useState(false);
     const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
     const [finalPrice, setFinalPrice] = useState(service?.base_price || 0);

     // Handle plan selection
     const handlePlanSelection = (
       recurring: boolean,
       planId: string | null,
       price: number
     ) => {
       setIsRecurring(recurring);
       setSelectedPlanId(planId);
       setFinalPrice(price);
     };

     // Modify the payment intent creation for subscriptions
     const createPaymentForBooking = async (bookingId) => {
       try {
         let response;

         if (isRecurring && selectedPlanId) {
           // Create a subscription
           response = await fetch(
             `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-functions/create-subscription`,
             {
               method: "POST",
               headers: {
                 "Content-Type": "application/json",
                 Authorization: `Bearer ${session?.access_token}`,
               },
               body: JSON.stringify({
                 bookingId,
                 planId: selectedPlanId,
               }),
             }
           );
         } else {
           // Create a one-time payment
           response = await fetch(
             `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-functions/create-payment-intent`,
             {
               method: "POST",
               headers: {
                 "Content-Type": "application/json",
                 Authorization: `Bearer ${session?.access_token}`,
               },
               body: JSON.stringify({
                 amount: Math.round(finalPrice * 100), // Convert to cents
                 bookingId,
               }),
             }
           );
         }

         return await response.json();
       } catch (error) {
         console.error("Error creating payment:", error);
         throw error;
       }
     };

     // Add the SubscriptionSelector to your form
     <SubscriptionSelector
       serviceId={service.id}
       basePrice={service.base_price}
       onSelectPlan={handlePlanSelection}
     />;
     ```

### Task 6.2: Implement Payment Management Screen

**Subtasks:**

1. **Create a payment methods management screen**

   - Allow users to view, add, and remove payment methods
   - Set default payment method
   - Display last 4 digits and card type for saved cards

2. **Implement subscription management**
   - Allow users to view and manage their subscriptions
   - Support cancellation and plan changes
   - Display upcoming payments and billing history

### Task 6.3: Address Mobile-Specific Payment Challenges

**Subtasks:**

1. **Implement offline detection and recovery**

   - Detect network status changes during payment processing
   - Implement graceful recovery from network interruptions
   - Store payment state locally to resume interrupted payments

2. **Optimize for mobile performance**

   - Minimize payment form loading time
   - Implement proper loading states during payment processing
   - Optimize payment flow for touch interactions

3. **Enhance mobile payment UX**
   - Add haptic feedback for payment events
   - Implement clear error messages for payment failures
   - Add animations for payment success/failure states

### Task 6.4: Update Booking Flow Integration

**Subtasks:**

1. **Modify handleBookingComplete function in booking.tsx**

   - Integrate with Stripe payment processing
   - Handle payment success and failure cases
   - Update booking status based on payment result

2. **Add payment confirmation screen**
   - Create a payment confirmation component
   - Display payment details and receipt
   - Provide options for saving payment method

## Priority 7: Testing and Security

### Task 7.1: Implement Comprehensive Testing

**Subtasks:**

1. **Set up test environment**

   - Configure test API keys
   - Set up test database
   - Create test users and data

2. **Write unit tests for payment functions**

   - Test payment processing
   - Test subscription creation
   - Test error handling

3. **Perform end-to-end testing**

   - Test complete payment flow
   - Test subscription flow
   - Test edge cases (network failures, declined cards, etc.)

4. **Implement Stripe-specific testing**
   - Create a test suite using Stripe's test cards for various scenarios:
     - 4242 4242 4242 4242: Successful payment
     - 4000 0000 0000 0002: Card declined
     - 4000 0000 0000 3220: 3D Secure 2 authentication required
     - 4000 0027 6000 3184: Test specific decline reasons
   - Test webhook handling using Stripe's webhook testing tools
   - Test subscription creation, cancellation, and renewal flows
   - Test refund processing and dispute handling

### Task 7.2: Implement Security Best Practices

**Subtasks:**

1. **Secure API keys and secrets**

   - Store API keys in environment variables
   - Use Supabase Vault for sensitive data
   - Never expose secret keys in client code

2. **Implement proper authentication and authorization**

   - Verify user identity before processing payments
   - Check permissions for all operations
   - Implement rate limiting for sensitive endpoints

3. **Add fraud prevention measures**

   - Implement Stripe Radar rules
   - Add address verification
   - Monitor for suspicious activity

4. **Ensure PCI Compliance**
   - Use Stripe Elements to avoid handling card data directly
   - Implement proper data sanitization for all user inputs
   - Set up proper logging that excludes sensitive payment information
   - Review and implement Stripe's security best practices

## Priority 8: Performance Optimization and Monitoring

### Task 8.1: Optimize App Performance

**Subtasks:**

1. **Implement caching for frequently accessed data**

   - Cache service listings
   - Cache user profiles
   - Implement proper cache invalidation

2. **Optimize React Native components**

   - Use memo and useCallback for expensive components
   - Implement virtualized lists for long scrolling screens
   - Optimize images and assets

3. **Reduce bundle size**
   - Remove unused dependencies
   - Implement code splitting
   - Optimize asset sizes

### Task 8.2: Set Up Monitoring and Analytics

**Subtasks:**

1. **Implement error tracking**

   - Set up Sentry or similar error tracking service
   - Add custom context to error reports
   - Set up alerts for critical errors

2. **Add analytics**

   - Track key user actions
   - Monitor conversion rates
   - Analyze drop-off points in the payment flow

3. **Set up performance monitoring**

   - Track API response times
   - Monitor app load times
   - Identify performance bottlenecks

4. **Set up Stripe-specific monitoring**

   - Track key payment metrics:
     - Payment success rate
     - Average transaction value
     - Subscription churn rate
     - Refund rate
   - Create alerts for unusual payment patterns
   - Implement dashboards for financial reporting
   - Create a custom dashboard component:

     ```typescript
     // In app/components/admin/StripeMetricsDashboard.tsx
     import React, { useState, useEffect } from "react";
     import { View, Text, StyleSheet, ScrollView } from "react-native";
     import { supabase } from "../../../lib/supabase";
     import { LineChart, BarChart } from "react-native-chart-kit";

     export default function StripeMetricsDashboard() {
       const [metrics, setMetrics] = useState({
         paymentSuccessRate: 0,
         avgTransactionValue: 0,
         subscriptionChurnRate: 0,
         refundRate: 0,
       });

       const [dailyRevenue, setDailyRevenue] = useState({
         labels: [],
         datasets: [{ data: [] }],
       });

       useEffect(() => {
         fetchMetrics();
         fetchDailyRevenue();

         // Set up polling for real-time updates
         const interval = setInterval(() => {
           fetchMetrics();
         }, 300000); // 5 minutes

         return () => clearInterval(interval);
       }, []);

       const fetchMetrics = async () => {
         // Fetch payment success rate
         const { data: successData } = await supabase.rpc(
           "calculate_payment_success_rate"
         );

         // Fetch average transaction value
         const { data: avgData } = await supabase.rpc(
           "calculate_avg_transaction_value"
         );

         // Fetch subscription churn rate
         const { data: churnData } = await supabase.rpc(
           "calculate_subscription_churn_rate"
         );

         // Fetch refund rate
         const { data: refundData } = await supabase.rpc(
           "calculate_refund_rate"
         );

         setMetrics({
           paymentSuccessRate: successData?.[0]?.rate || 0,
           avgTransactionValue: avgData?.[0]?.avg_value || 0,
           subscriptionChurnRate: churnData?.[0]?.rate || 0,
           refundRate: refundData?.[0]?.rate || 0,
         });
       };

       const fetchDailyRevenue = async () => {
         const { data } = await supabase.rpc("get_daily_revenue", {
           days_back: 7,
         });

         if (data) {
           setDailyRevenue({
             labels: data.map((d) => d.date),
             datasets: [
               {
                 data: data.map((d) => d.revenue),
               },
             ],
           });
         }
       };

       return (
         <ScrollView style={styles.container}>
           <Text style={styles.title}>Stripe Payment Metrics</Text>

           <View style={styles.metricsContainer}>
             <View style={styles.metricCard}>
               <Text style={styles.metricLabel}>Payment Success Rate</Text>
               <Text style={styles.metricValue}>
                 {(metrics.paymentSuccessRate * 100).toFixed(1)}%
               </Text>
             </View>

             <View style={styles.metricCard}>
               <Text style={styles.metricLabel}>Avg Transaction</Text>
               <Text style={styles.metricValue}>
                 ${metrics.avgTransactionValue.toFixed(2)}
               </Text>
             </View>

             <View style={styles.metricCard}>
               <Text style={styles.metricLabel}>Subscription Churn</Text>
               <Text style={styles.metricValue}>
                 {(metrics.subscriptionChurnRate * 100).toFixed(1)}%
               </Text>
             </View>

             <View style={styles.metricCard}>
               <Text style={styles.metricLabel}>Refund Rate</Text>
               <Text style={styles.metricValue}>
                 {(metrics.refundRate * 100).toFixed(1)}%
               </Text>
             </View>
           </View>

           <View style={styles.chartContainer}>
             <Text style={styles.chartTitle}>Daily Revenue (Last 7 Days)</Text>
             {dailyRevenue.labels.length > 0 && (
               <LineChart
                 data={dailyRevenue}
                 width={350}
                 height={220}
                 chartConfig={{
                   backgroundColor: "#ffffff",
                   backgroundGradientFrom: "#ffffff",
                   backgroundGradientTo: "#ffffff",
                   decimalPlaces: 0,
                   color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                   labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                   style: {
                     borderRadius: 16,
                   },
                 }}
                 bezier
                 style={{
                   marginVertical: 8,
                   borderRadius: 16,
                 }}
               />
             )}
           </View>
         </ScrollView>
       );
     }

     const styles = StyleSheet.create({
       container: {
         flex: 1,
         padding: 16,
         backgroundColor: "#f9fafb",
       },
       title: {
         fontSize: 20,
         fontWeight: "bold",
         marginBottom: 16,
         color: "#111827",
       },
       metricsContainer: {
         flexDirection: "row",
         flexWrap: "wrap",
         justifyContent: "space-between",
         marginBottom: 24,
       },
       metricCard: {
         width: "48%",
         backgroundColor: "#ffffff",
         borderRadius: 12,
         padding: 16,
         marginBottom: 16,
         shadowColor: "#000",
         shadowOffset: { width: 0, height: 1 },
         shadowOpacity: 0.1,
         shadowRadius: 2,
         elevation: 2,
       },
       metricLabel: {
         fontSize: 14,
         color: "#6b7280",
         marginBottom: 8,
       },
       metricValue: {
         fontSize: 24,
         fontWeight: "bold",
         color: "#10b981",
       },
       chartContainer: {
         backgroundColor: "#ffffff",
         borderRadius: 12,
         padding: 16,
         marginBottom: 16,
         shadowColor: "#000",
         shadowOffset: { width: 0, height: 1 },
         shadowOpacity: 0.1,
         shadowRadius: 2,
         elevation: 2,
       },
       chartTitle: {
         fontSize: 16,
         fontWeight: "bold",
         marginBottom: 8,
         color: "#111827",
       },
     });
     ```

## Priority 9: Documentation and Launch Preparation

### Task 9.1: Create Documentation

**Subtasks:**

1. **Document API endpoints**

   - Document all Edge Functions
   - Document expected inputs and outputs
   - Document error codes and handling

2. **Create developer documentation**

   - Document codebase structure
   - Document key components and services
   - Create onboarding guide for new developers

3. **Create user documentation**
   - Write help articles for common tasks
   - Create FAQs for payment-related questions
   - Document subscription management

### Task 9.2: Prepare for Launch

**Subtasks:**

1. **Switch to production environment**

   - Update API keys to production
   - Configure production database
   - Set up production webhooks

2. **Perform final testing**

   - Test all critical flows in production environment
   - Verify webhook handling
   - Test edge cases

3. **Create launch checklist**
   - Verify all critical features
   - Check compliance requirements
   - Prepare marketing materials
