import "dotenv/config";
import { supabase } from "../lib/supabase";
// @ts-ignore: stripe types may not be installed
import Stripe from "stripe";

let testUserId: string;

describe("Stripe Edge Functions Integration", () => {
  beforeAll(async () => {
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;
    // Sign up test user (ignore error if already registered)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (
      signUpError &&
      !signUpError.message.includes("User already registered")
    ) {
      throw signUpError;
    }
    // Sign in to create session
    const {
      data: { session },
      error: signInError,
    } = await supabase.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
    expect(session).toBeDefined();
    const sess = session!;
    testUserId = session.user.id;
  });

  it("should create a new Stripe customer via stripe-customer-api", async () => {
    const { data, error } = await supabase.functions.invoke(
      "stripe-customer-api",
      {
        body: {
          path: "create-customer",
          payload: { name: "Test User", phone: "+1234567890" },
        },
      }
    );
    expect(error).toBeNull();
    expect(data.customerId).toBeDefined();
  });

  it("should create a payment intent via stripe-payment-api", async () => {
    const { data, error } = await supabase.functions.invoke(
      "stripe-payment-api",
      {
        body: {
          path: "create-payment-intent",
          payload: { amount: 1000, currency: "usd" },
        },
      }
    );
    expect(error).toBeNull();
    // Expect the shape returned by stripe-payment-api
    expect(data.paymentIntentClientSecret).toBeDefined();
    expect(data.ephemeralKeySecret).toBeDefined();
    expect(data.customerId).toBeDefined();
    expect(data.publishableKey).toBeDefined();
  });

  it("should return payment details suitable for client confirmation", async () => {
    const { data, error } = await supabase.functions.invoke(
      "stripe-payment-api",
      {
        body: {
          path: "create-payment-intent",
          payload: { amount: 2500, currency: "usd" },
        },
      }
    );
    expect(error).toBeNull();
    expect(data.paymentIntentClientSecret).toBeDefined();
    expect(data.ephemeralKeySecret).toBeDefined();
    expect(data.customerId).toBeDefined();
    expect(data.publishableKey).toBeDefined();
  });

  it("should handle webhook events idempotently", async () => {
    const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    });
    // Create a test PaymentIntent with metadata
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: 1000,
      currency: "usd",
      metadata: { supabase_user_id: testUserId },
    });
    const eventPayload = {
      id: `evt_test_${Date.now()}`,
      object: "event",
      type: "payment_intent.succeeded",
      data: { object: paymentIntent },
    };
    const payload = JSON.stringify(eventPayload);
    const signature = stripeClient.webhooks.generateTestHeaderString({
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
      payload,
    });
    // Clean any existing payment records for this intent
    await supabase.from("payments").delete().neq("stripe_payment_id", null);
    // Invoke webhook twice with same payload
    await supabase.functions.invoke("stripe-webhook", {
      body: payload,
      headers: { "stripe-signature": signature },
    });
    await supabase.functions.invoke("stripe-webhook", {
      body: payload,
      headers: { "stripe-signature": signature },
    });
    // Verify only one record is created
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("stripe_payment_id", paymentIntent.id);
    expect(payments).toBeDefined();
    const records = payments!;
    expect(records.length).toBe(1);
  });
});
