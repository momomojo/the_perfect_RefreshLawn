## 1. Supabase Integration

### 1.1 Project Setup and Configuration

1. **Create Supabase Project**

   ```bash
   # Install Supabase CLI for local development
   npm install -g supabase

   # Login to Supabase
   supabase login

   # Link to existing Supabase project (if already created)
   supabase link --project-ref <project-id>
   ```

2. **Install Required Dependencies**

   ```bash
   # Install Supabase client libraries
   npm install @supabase/supabase-js

   # For Expo/React Native
   npm install react-native-url-polyfill
   npm install @react-native-async-storage/async-storage
   ```

3. **Initialize Supabase Client in App**
   Create a lib/supabase.ts file:

   ```typescript
   import "react-native-url-polyfill/auto";
   import AsyncStorage from "@react-native-async-storage/async-storage";
   import { createClient } from "@supabase/supabase-js";

   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       storage: AsyncStorage,
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: false,
     },
   });
   ```

4. **Environment Variables Setup**
   Create .env file and configure app.config.js:
   ```javascript
   // app.config.js
   export default {
     expo: {
       // ...other configuration
       extra: {
         supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
         supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
       },
     },
   };
   ```

### 1.2 Database Schema Setup

Create the following tables and relationships in Supabase:

1. **profiles** - Extended user information

   ```sql
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
     first_name TEXT,
     last_name TEXT,
     role TEXT CHECK (role IN ('customer', 'technician', 'admin')),
     phone TEXT,
     address TEXT,
     city TEXT,
     state TEXT,
     zip_code TEXT,
     profile_image_url TEXT,
     stripe_customer_id TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Trigger to create profile after user signup
   CREATE OR REPLACE FUNCTION create_profile_for_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.profiles (id)
     VALUES (NEW.id);
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER create_profile_after_signup
   AFTER INSERT ON auth.users
   FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();
   ```

2. **services** - Lawn care service offerings

   ```sql
   CREATE TABLE services (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     description TEXT,
     base_price DECIMAL(10, 2) NOT NULL,
     duration_minutes INTEGER,
     image_url TEXT,
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. **recurring_plans** - Subscription plan options

   ```sql
   CREATE TABLE recurring_plans (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     description TEXT,
     frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
     discount_percentage DECIMAL(5, 2),
     stripe_price_id TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

4. **bookings** - Service appointments

   ```sql
   CREATE TABLE bookings (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     customer_id UUID REFERENCES profiles(id) NOT NULL,
     technician_id UUID REFERENCES profiles(id),
     service_id UUID REFERENCES services(id) NOT NULL,
     recurring_plan_id UUID REFERENCES recurring_plans(id),
     status TEXT CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
     price DECIMAL(10, 2) NOT NULL,
     scheduled_date DATE NOT NULL,
     scheduled_time TIME NOT NULL,
     address TEXT,
     notes TEXT,
     stripe_payment_intent_id TEXT,
     stripe_subscription_id TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

5. **reviews** - Customer reviews for completed services

   ```sql
   CREATE TABLE reviews (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     booking_id UUID REFERENCES bookings(id) NOT NULL,
     customer_id UUID REFERENCES profiles(id) NOT NULL,
     technician_id UUID REFERENCES profiles(id) NOT NULL,
     rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
     comment TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

6. **payment_methods** - Stored payment methods
   ```sql
   CREATE TABLE payment_methods (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     customer_id UUID REFERENCES profiles(id) NOT NULL,
     stripe_payment_method_id TEXT NOT NULL,
     card_last4 TEXT,
     card_brand TEXT,
     is_default BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

### 1.3 Custom JWT Claims & Role-Based Access Control

1. **Create Custom JWT Auth Hook**
   Set up the custom hook in the Supabase Dashboard > Authentication > Hooks, or use SQL directly:

   ```sql
   CREATE OR REPLACE FUNCTION supabase_auth.jwt() RETURNS jsonb
   LANGUAGE sql STABLE
   SECURITY DEFINER SET search_path = auth
   AS $$
     SELECT
       coalesce(
         nullif(current_setting('request.jwt.claim', true), ''),
         nullif(current_setting('request.jwt.claims', true), '')
       )::jsonb
   $$;

   CREATE OR REPLACE FUNCTION add_user_role_to_jwt()
   RETURNS trigger AS $$
   DECLARE
     profile_role TEXT;
   BEGIN
     SELECT role INTO profile_role FROM public.profiles WHERE id = NEW.id;

     IF profile_role IS NOT NULL THEN
       -- Add custom claims
       NEW.raw_app_meta_data := jsonb_set(
         coalesce(NEW.raw_app_meta_data, '{}'::jsonb),
         '{user_role}',
         to_jsonb(profile_role)
       );
     END IF;

     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Trigger to add user role to JWT on login
   CREATE TRIGGER add_role_on_user_login
   BEFORE UPDATE ON auth.users
   FOR EACH ROW
   WHEN (OLD.raw_app_meta_data IS DISTINCT FROM NEW.raw_app_meta_data)
   EXECUTE FUNCTION add_user_role_to_jwt();
   ```

2. **Create Authorization Function for RLS**

   ```sql
   CREATE OR REPLACE FUNCTION auth.is_admin()
   RETURNS BOOLEAN AS $$
   BEGIN
     RETURN (
       COALESCE(
         current_setting('request.jwt.claims', true)::json->>'user_role',
         current_setting('request.jwt.claim', true)::json->>'user_role',
         'none'
       ) = 'admin'
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE OR REPLACE FUNCTION auth.is_technician()
   RETURNS BOOLEAN AS $$
   BEGIN
     RETURN (
       COALESCE(
         current_setting('request.jwt.claims', true)::json->>'user_role',
         current_setting('request.jwt.claim', true)::json->>'user_role',
         'none'
       ) = 'technician'
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE OR REPLACE FUNCTION auth.is_customer()
   RETURNS BOOLEAN AS $$
   BEGIN
     RETURN (
       COALESCE(
         current_setting('request.jwt.claims', true)::json->>'user_role',
         current_setting('request.jwt.claim', true)::json->>'user_role',
         'none'
       ) = 'customer'
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

### 1.4 Row-Level Security Policies

Apply RLS policies to each table to enforce access control:

1. **profiles Table RLS**

   ```sql
   -- Enable RLS on profiles
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

   -- Admin can read all profiles
   CREATE POLICY admin_read_all_profiles
     ON profiles FOR SELECT
     USING (auth.is_admin());

   -- Users can read their own profile
   CREATE POLICY users_read_own_profile
     ON profiles FOR SELECT
     USING (auth.uid() = id);

   -- Users can update their own profile
   CREATE POLICY users_update_own_profile
     ON profiles FOR UPDATE
     USING (auth.uid() = id);

   -- Technicians can read limited customer profile info
   CREATE POLICY technicians_read_customer_profiles
     ON profiles FOR SELECT
     USING (
       auth.is_technician() AND
       EXISTS (
         SELECT 1 FROM bookings
         WHERE technician_id = auth.uid() AND customer_id = profiles.id
       )
     );
   ```

2. **bookings Table RLS**

   ```sql
   -- Enable RLS on bookings
   ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

   -- Admin can do everything
   CREATE POLICY admin_manage_all_bookings
     ON bookings FOR ALL
     USING (auth.is_admin());

   -- Customer can view their own bookings
   CREATE POLICY customers_view_own_bookings
     ON bookings FOR SELECT
     USING (customer_id = auth.uid());

   -- Customer can create bookings for themselves
   CREATE POLICY customers_create_bookings
     ON bookings FOR INSERT
     WITH CHECK (customer_id = auth.uid());

   -- Customer can update their bookings with restrictions
   CREATE POLICY customers_update_own_bookings
     ON bookings FOR UPDATE
     USING (customer_id = auth.uid())
     WITH CHECK (
       customer_id = auth.uid() AND
       (status = 'pending' OR status = 'scheduled')
     );

   -- Technician can view assigned bookings
   CREATE POLICY technicians_view_assigned_bookings
     ON bookings FOR SELECT
     USING (technician_id = auth.uid());

   -- Technician can update status of assigned bookings
   CREATE POLICY technicians_update_assigned_bookings
     ON bookings FOR UPDATE
     USING (technician_id = auth.uid())
     WITH CHECK (technician_id = auth.uid());
   ```

Implement similar RLS policies for the other tables (services, reviews, recurring_plans, payment_methods).

### 1.5 Authentication Implementation in React Native

1. **Auth Context Setup**
   Create a file lib/auth.tsx:

   ```typescript
   import React, {
     createContext,
     useState,
     useEffect,
     useContext,
   } from "react";
   import { Session, User } from "@supabase/supabase-js";
   import { supabase } from "./supabase";

   interface AuthState {
     session: Session | null;
     user: User | null;
     userRole: "customer" | "technician" | "admin" | null;
     isLoading: boolean;
   }

   interface AuthContextType extends AuthState {
     signUp: (
       email: string,
       password: string,
       role: string,
       userData: any
     ) => Promise<void>;
     signIn: (email: string, password: string) => Promise<void>;
     signOut: () => Promise<void>;
     resetPassword: (email: string) => Promise<void>;
   }

   const AuthContext = createContext<AuthContextType | undefined>(undefined);

   export function AuthProvider({ children }: { children: React.ReactNode }) {
     const [state, setState] = useState<AuthState>({
       session: null,
       user: null,
       userRole: null,
       isLoading: true,
     });

     useEffect(() => {
       // Get initial session
       supabase.auth.getSession().then(({ data: { session } }) => {
         setState((s) => ({
           ...s,
           session,
           user: session?.user ?? null,
           userRole: session?.user?.app_metadata?.user_role ?? null,
           isLoading: false,
         }));
       });

       // Listen for auth changes
       const {
         data: { subscription },
       } = supabase.auth.onAuthStateChange((_event, session) => {
         setState((s) => ({
           ...s,
           session,
           user: session?.user ?? null,
           userRole: session?.user?.app_metadata?.user_role ?? null,
           isLoading: false,
         }));
       });

       return () => {
         subscription.unsubscribe();
       };
     }, []);

     const signUp = async (
       email: string,
       password: string,
       role: string,
       userData: any
     ) => {
       const { error } = await supabase.auth.signUp({
         email,
         password,
         options: {
           data: {
             first_name: userData.firstName,
             last_name: userData.lastName,
           },
         },
       });

       if (error) throw error;

       // Update profile with role and additional data
       if (role) {
         const { error: profileError } = await supabase
           .from("profiles")
           .update({
             role,
             ...userData,
           })
           .eq("id", (await supabase.auth.getUser()).data.user?.id);

         if (profileError) throw profileError;
       }
     };

     const signIn = async (email: string, password: string) => {
       const { error } = await supabase.auth.signInWithPassword({
         email,
         password,
       });
       if (error) throw error;
     };

     const signOut = async () => {
       const { error } = await supabase.auth.signOut();
       if (error) throw error;
     };

     const resetPassword = async (email: string) => {
       const { error } = await supabase.auth.resetPasswordForEmail(email);
       if (error) throw error;
     };

     return (
       <AuthContext.Provider
         value={{
           ...state,
           signUp,
           signIn,
           signOut,
           resetPassword,
         }}
       >
         {children}
       </AuthContext.Provider>
     );
   }

   export function useAuth() {
     const context = useContext(AuthContext);
     if (context === undefined) {
       throw new Error("useAuth must be used within an AuthProvider");
     }
     return context;
   }
   ```

2. **Apply Auth Provider to App**
   Modify app/\_layout.tsx:

   ```tsx
   import { AuthProvider } from "../lib/auth";

   export default function RootLayout() {
     // ... existing code

     return (
       <AuthProvider>
         <ThemeProvider value={DefaultTheme}>
           {/* Rest of your existing app */}
         </ThemeProvider>
       </AuthProvider>
     );
   }
   ```

3. **Role-Based Navigation**
   Create a protected layout component:

   ```tsx
   // app/components/ProtectedRoute.tsx
   import React from "react";
   import { View, Text } from "react-native";
   import { useAuth } from "../../lib/auth";
   import { Redirect } from "expo-router";

   interface ProtectedRouteProps {
     children: React.ReactNode;
     requiredRole?: "customer" | "technician" | "admin" | null;
   }

   export default function ProtectedRoute({
     children,
     requiredRole,
   }: ProtectedRouteProps) {
     const { user, userRole, isLoading } = useAuth();

     if (isLoading) {
       return (
         <View>
           <Text>Loading...</Text>
         </View>
       );
     }

     if (!user) {
       return <Redirect href="/" />;
     }

     if (requiredRole && userRole !== requiredRole) {
       // Redirect based on actual role
       if (userRole === "customer") {
         return <Redirect href="/(customer)/dashboard" />;
       } else if (userRole === "technician") {
         return <Redirect href="/(technician)/dashboard" />;
       } else if (userRole === "admin") {
         return <Redirect href="/(admin)/dashboard" />;
       }
     }

     return <>{children}</>;
   }
   ```

4. **Apply Protection to Role-Specific Routes**
   Modify role-specific layout files:

   ```tsx
   // Example for app/(customer)/_layout.tsx
   import ProtectedRoute from "../components/ProtectedRoute";

   export default function CustomerLayout() {
     return (
       <ProtectedRoute requiredRole="customer">
         {/* Your existing customer layout */}
       </ProtectedRoute>
     );
   }
   ```

## 2. Stripe Integration

### 2.1 Install Stripe SDK and Setup Client

1. **Install Dependencies**

   ```bash
   npm install @stripe/stripe-react-native
   ```

2. **Initialize Stripe Provider**
   Modify your app/\_layout.tsx:

   ```tsx
   import { StripeProvider } from "@stripe/stripe-react-native";
   import { AuthProvider } from "../lib/auth";

   export default function RootLayout() {
     // ... existing code

     return (
       <AuthProvider>
         <StripeProvider
           publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
           merchantIdentifier="merchant.com.lawnrefresh"
         >
           <ThemeProvider value={DefaultTheme}>
             {/* Rest of your existing app */}
           </ThemeProvider>
         </StripeProvider>
       </AuthProvider>
     );
   }
   ```

### 2.2 Create Supabase Edge Functions for Stripe Operations

1. **Create a new Edge Function**

   ```bash
   supabase functions new stripe-functions
   ```

2. **Edge Function for Stripe Customer Creation**

   ```typescript
   // supabase/functions/stripe-functions/index.ts
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

   interface WebhookPayload {
     type: string;
     data: {
       object: any;
     };
   }

   async function createStripeCustomer(
     userId: string,
     email: string,
     name: string
   ) {
     try {
       // Create customer in Stripe
       const customer = await stripe.customers.create({
         email,
         name,
         metadata: {
           userId,
         },
       });

       // Update profile with Stripe customer ID
       const { error } = await supabase
         .from("profiles")
         .update({ stripe_customer_id: customer.id })
         .eq("id", userId);

       if (error) throw error;

       return { customerId: customer.id };
     } catch (error) {
       console.error("Error creating customer:", error);
       throw error;
     }
   }

   async function createPaymentIntent(
     amount: number,
     customerId: string,
     metadata: any
   ) {
     try {
       const paymentIntent = await stripe.paymentIntents.create({
         amount,
         currency: "usd",
         customer: customerId,
         metadata,
       });

       return {
         clientSecret: paymentIntent.client_secret,
         paymentIntentId: paymentIntent.id,
       };
     } catch (error) {
       console.error("Error creating payment intent:", error);
       throw error;
     }
   }

   async function createSubscription(
     customerId: string,
     priceId: string,
     metadata: any
   ) {
     try {
       const subscription = await stripe.subscriptions.create({
         customer: customerId,
         items: [{ price: priceId }],
         metadata,
         payment_behavior: "default_incomplete",
         expand: ["latest_invoice.payment_intent"],
       });

       return {
         subscriptionId: subscription.id,
         clientSecret: (subscription.latest_invoice as any).payment_intent
           .client_secret,
       };
     } catch (error) {
       console.error("Error creating subscription:", error);
       throw error;
     }
   }

   async function handleWebhook(payload: WebhookPayload) {
     const { type, data } = payload;

     switch (type) {
       case "payment_intent.succeeded":
         // Update booking status
         const paymentIntent = data.object;
         await handlePaymentSuccess(paymentIntent);
         break;

       case "invoice.paid":
         // Handle subscription payment
         const invoice = data.object;
         await handleSubscriptionPayment(invoice);
         break;

       // Handle other webhook events
     }

     return { success: true };
   }

   async function handlePaymentSuccess(paymentIntent: any) {
     const bookingId = paymentIntent.metadata.booking_id;
     if (bookingId) {
       await supabase
         .from("bookings")
         .update({ status: "scheduled" })
         .eq("id", bookingId)
         .eq("stripe_payment_intent_id", paymentIntent.id);
     }
   }

   async function handleSubscriptionPayment(invoice: any) {
     const subscriptionId = invoice.subscription;
     // Update subscription status in our database
   }

   serve(async (req) => {
     const url = new URL(req.url);
     const path = url.pathname.split("/").pop();

     if (req.method === "POST") {
       const body = await req.json();

       try {
         let result;
         const authHeader = req.headers.get("Authorization");

         if (path === "webhook") {
           // Webhooks don't require auth
           result = await handleWebhook(body);
         } else {
           // All other endpoints require auth
           if (!authHeader) {
             return new Response(JSON.stringify({ error: "Unauthorized" }), {
               status: 401,
               headers: { "Content-Type": "application/json" },
             });
           }

           const token = authHeader.replace("Bearer ", "");
           const {
             data: { user },
             error,
           } = await supabase.auth.getUser(token);

           if (error || !user) {
             return new Response(JSON.stringify({ error: "Unauthorized" }), {
               status: 401,
               headers: { "Content-Type": "application/json" },
             });
           }

           switch (path) {
             case "create-customer":
               result = await createStripeCustomer(
                 user.id,
                 body.email,
                 `${body.firstName} ${body.lastName}`
               );
               break;

             case "create-payment-intent":
               result = await createPaymentIntent(
                 body.amount,
                 body.customerId,
                 { booking_id: body.bookingId }
               );
               break;

             case "create-subscription":
               result = await createSubscription(
                 body.customerId,
                 body.priceId,
                 { booking_id: body.bookingId }
               );
               break;

             default:
               return new Response(JSON.stringify({ error: "Not found" }), {
                 status: 404,
                 headers: { "Content-Type": "application/json" },
               });
           }
         }

         return new Response(JSON.stringify(result), {
           status: 200,
           headers: { "Content-Type": "application/json" },
         });
       } catch (error: any) {
         return new Response(JSON.stringify({ error: error.message }), {
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
   ```

3. **Deploy the Edge Function**
   ```bash
   supabase functions deploy stripe-functions --no-verify-jwt
   ```

### 2.3 Implement Payment Processing in App

1. **Create Payment Service**
   Create lib/payment.ts:

   ```typescript
   import { supabase } from "./supabase";

   export async function getStripeCustomerId(
     userId: string
   ): Promise<string | null> {
     const { data, error } = await supabase
       .from("profiles")
       .select("stripe_customer_id")
       .eq("id", userId)
       .single();

     if (error || !data) return null;

     if (data.stripe_customer_id) {
       return data.stripe_customer_id;
     }

     // Create customer if not exists
     const { data: userData } = await supabase
       .from("profiles")
       .select("first_name, last_name")
       .eq("id", userId)
       .single();

     const { data: user } = await supabase.auth.getUser();

     // Create customer via edge function
     const response = await fetch(
       `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-functions/create-customer`,
       {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${user.session?.access_token}`,
         },
         body: JSON.stringify({
           email: user.user?.email,
           firstName: userData.first_name,
           lastName: userData.last_name,
         }),
       }
     );

     const result = await response.json();
     return result.customerId;
   }

   export async function createPaymentIntent(
     amount: number,
     bookingId: string
   ) {
     const { data: user } = await supabase.auth.getUser();
     if (!user.user) throw new Error("User not authenticated");

     const customerId = await getStripeCustomerId(user.user.id);
     if (!customerId)
       throw new Error("Could not get or create Stripe customer");

     const response = await fetch(
       `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-functions/create-payment-intent`,
       {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${user.session?.access_token}`,
         },
         body: JSON.stringify({
           amount: Math.round(amount * 100), // Convert to cents
           customerId,
           bookingId,
         }),
       }
     );

     const result = await response.json();
     if (result.error) throw new Error(result.error);

     return result;
   }

   export async function createSubscription(
     priceId: string,
     bookingId: string
   ) {
     const { data: user } = await supabase.auth.getUser();
     if (!user.user) throw new Error("User not authenticated");

     const customerId = await getStripeCustomerId(user.user.id);
     if (!customerId)
       throw new Error("Could not get or create Stripe customer");

     const response = await fetch(
       `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-functions/create-subscription`,
       {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${user.session?.access_token}`,
         },
         body: JSON.stringify({
           customerId,
           priceId,
           bookingId,
         }),
       }
     );

     const result = await response.json();
     if (result.error) throw new Error(result.error);

     return result;
   }
   ```

2. **Implement Payment Sheet in Booking Flow**
   Modify the BookingForm component:

   ```tsx
   // In app/components/customer/BookingForm.tsx
   import { PaymentSheet, useStripe } from "@stripe/stripe-react-native";
   import { createPaymentIntent, createSubscription } from "../../lib/payment";

   // Add to your component
   const { initPaymentSheet, presentPaymentSheet } = useStripe();

   // Add payment processing function
   const processPayment = async (bookingData) => {
     try {
       // Create booking in Supabase
       const { data: booking, error } = await supabase
         .from("bookings")
         .insert({
           customer_id: user.id,
           service_id: bookingData.serviceId,
           recurring_plan_id: bookingData.isRecurring
             ? bookingData.recurringPlanId
             : null,
           price: bookingData.price,
           scheduled_date: bookingData.date,
           scheduled_time: bookingData.time,
           address: bookingData.address,
           notes: bookingData.notes,
           status: "pending",
         })
         .select()
         .single();

       if (error) throw error;

       // Get client secret for payment
       let clientSecret;
       if (bookingData.isRecurring) {
         // For subscriptions
         const { clientSecret: subClientSecret, subscriptionId } =
           await createSubscription(bookingData.stripePriceId, booking.id);

         clientSecret = subClientSecret;

         // Update booking with subscription ID
         await supabase
           .from("bookings")
           .update({ stripe_subscription_id: subscriptionId })
           .eq("id", booking.id);
       } else {
         // For one-time payments
         const { clientSecret: paymentClientSecret, paymentIntentId } =
           await createPaymentIntent(bookingData.price, booking.id);

         clientSecret = paymentClientSecret;

         // Update booking with payment intent ID
         await supabase
           .from("bookings")
           .update({ stripe_payment_intent_id: paymentIntentId })
           .eq("id", booking.id);
       }

       // Initialize payment sheet
       const { error: sheetError } = await initPaymentSheet({
         paymentIntentClientSecret: clientSecret,
         merchantDisplayName: "Lawn Refresh",
         customFlow: false,
         style: "automatic",
       });

       if (sheetError) throw sheetError;

       // Present payment sheet
       const { error: presentError } = await presentPaymentSheet();

       if (presentError) {
         // Handle payment cancellation or failure
         console.error("Payment failed:", presentError);

         // You might want to update booking status or delete the booking
         return { success: false, error: presentError };
       }

       // Payment successful
       return { success: true, bookingId: booking.id };
     } catch (error) {
       console.error("Error processing payment:", error);
       return { success: false, error };
     }
   };
   ```

## 3. Connect Frontend to Backend

### 3.1 Replace Mock Authentication with Supabase Auth

1. **Update Login Form**
   Modify app/components/auth/LoginForm.tsx:

   ```tsx
   import { useAuth } from "../../lib/auth";

   // Inside component
   const { signIn } = useAuth();

   const handleLogin = async () => {
     if (!email || !password) {
       Alert.alert("Error", "Please enter both email and password");
       return;
     }

     try {
       await signIn(email, password);
       // Navigation is handled by the auth listener in AuthProvider
     } catch (error) {
       Alert.alert(
         "Login Failed",
         error instanceof Error ? error.message : "An unknown error occurred"
       );
     }
   };
   ```

2. **Update Registration Form**
   Modify app/components/auth/RegistrationForm.tsx to use real auth:

   ```tsx
   import { useAuth } from "../../lib/auth";

   // Inside component
   const { signUp } = useAuth();

   // Call signUp with the form data
   const handleRegister = async () => {
     try {
       await signUp(formData.email, formData.password, formData.role, {
         firstName: formData.firstName,
         lastName: formData.lastName,
         address: formData.address,
         city: formData.city,
         state: formData.state,
         zipCode: formData.zipCode,
       });
       // Handle success
     } catch (error) {
       // Handle error
     }
   };
   ```

### 3.2 Replace Mock Data with Supabase Queries

1. **Create Data Service**
   Create lib/data.ts:

   ```typescript
   import { supabase } from "./supabase";

   export async function getCustomerBookings(customerId: string) {
     const { data, error } = await supabase
       .from("bookings")
       .select(
         `
         *,
         service:services(*),
         technician:profiles(id, first_name, last_name),
         recurring_plan:recurring_plans(*)
       `
       )
       .eq("customer_id", customerId)
       .order("scheduled_date", { ascending: true });

     if (error) throw error;
     return data;
   }

   export async function getTechnicianJobs(technicianId: string) {
     const { data, error } = await supabase
       .from("bookings")
       .select(
         `
         *,
         service:services(*),
         customer:profiles(id, first_name, last_name, address, city, state)
       `
       )
       .eq("technician_id", technicianId)
       .order("scheduled_date", { ascending: true });

     if (error) throw error;
     return data;
   }

   export async function getServices() {
     const { data, error } = await supabase
       .from("services")
       .select("*")
       .eq("is_active", true);

     if (error) throw error;
     return data;
   }

   export async function getRecurringPlans() {
     const { data, error } = await supabase.from("recurring_plans").select("*");

     if (error) throw error;
     return data;
   }

   // Add more query functions as needed
   ```

2. **Customer Dashboard Component**
   Update app/(customer)/dashboard.tsx:

   ```tsx
   import { useState, useEffect } from "react";
   import { getCustomerBookings, getServices } from "../../lib/data";
   import { useAuth } from "../../lib/auth";

   // Inside component
   const { user } = useAuth();
   const [upcomingBookings, setUpcomingBookings] = useState([]);
   const [services, setServices] = useState([]);
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
     async function loadData() {
       try {
         setIsLoading(true);
         if (user) {
           const bookingsData = await getCustomerBookings(user.id);
           // Filter for upcoming
           const upcoming = bookingsData.filter(
             (b) =>
               new Date(b.scheduled_date) >= new Date() &&
               (b.status === "scheduled" || b.status === "pending")
           );
           setUpcomingBookings(upcoming);

           const servicesData = await getServices();
           setServices(servicesData);
         }
       } catch (error) {
         console.error("Error loading data:", error);
       } finally {
         setIsLoading(false);
       }
     }

     loadData();
   }, [user]);

   // Rest of component using this data
   ```

3. **Technician Dashboard**
   Update app/(technician)/dashboard.tsx similarly.

### 3.3 Implement Real-time Updates

1. **Set Up Realtime Subscriptions**
   Add to the dashboard components:

   ```tsx
   useEffect(() => {
     if (!user) return;

     // Subscribe to changes in bookings
     const subscription = supabase
       .channel("public:bookings")
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "bookings",
           filter: `customer_id=eq.${user.id}`,
         },
         (payload) => {
           // Refresh data when changes occur
           loadData();
         }
       )
       .subscribe();

     return () => {
       supabase.removeChannel(subscription);
     };
   }, [user]);
   ```

2. **Job Status Updates for Technicians**
   Add real-time updates to job details:

   ```tsx
   // In job details component
   const updateJobStatus = async (status) => {
     try {
       const { error } = await supabase
         .from('bookings')
         .update({ status })
         .eq('id', jobId);

       if (error
   ```
