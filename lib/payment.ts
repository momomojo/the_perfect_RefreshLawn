import { supabase } from "./supabase";
import { queryWithRetry } from "./queryWithRetry"; // Import retry utility

// Dedicated module for payment-related operations
// (e.g., interacting with Stripe API functions, managing local payment data)

export {}; // Add export to make it a module

/**
 * PaymentMethod Interface (Moved from data.ts)
 */
export interface PaymentMethod {
  id: string;
  customer_id: string; // This is the Supabase user ID (auth.users.id)
  stripe_payment_method_id: string;
  card_last4?: string;
  card_brand?: string;
  is_default: boolean;
  created_at?: string;
}

/**
 * Payment method related functions (Moved from data.ts)
 */

/**
 * Get saved payment methods for a customer
 * @param customerId Supabase User ID
 */
export async function getCustomerPaymentMethods(customerId: string) {
  // Apply retry logic
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("payment_methods")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false })
  );

  if (error) throw error;
  return data as PaymentMethod[];
}

/**
 * Add a new payment method record to the database
 * @param paymentMethod Object containing payment method details
 */
export async function addPaymentMethod(
  paymentMethod: Omit<PaymentMethod, "id" | "created_at">
) {
  // Apply retry logic
  const { data, error } = await queryWithRetry(() =>
    supabase.from("payment_methods").insert(paymentMethod).select().single()
  );

  if (error) throw error;
  return data as PaymentMethod;
}

/**
 * Set a specific payment method as the default for a customer
 * @param paymentMethodId ID of the payment method to set as default
 * @param customerId Supabase User ID of the customer
 */
export async function setDefaultPaymentMethod(
  paymentMethodId: string,
  customerId: string
) {
  // Apply retry logic to the first update (unset defaults)
  const { error: updateError } = await queryWithRetry(() =>
    supabase
      .from("payment_methods")
      .update({ is_default: false })
      .eq("customer_id", customerId)
  );

  if (updateError) throw updateError;

  // Apply retry logic to the second update (set specific default)
  const { data, error } = await queryWithRetry(() =>
    supabase
      .from("payment_methods")
      .update({ is_default: true })
      .eq("id", paymentMethodId)
      .eq("customer_id", customerId)
      .select()
      .single()
  );

  if (error) throw error;
  return data as PaymentMethod;
}

/**
 * Remove a payment method record from the database
 * @param paymentMethodId ID of the payment method to remove
 */
export async function removePaymentMethod(paymentMethodId: string) {
  // Apply retry logic
  const { error } = await queryWithRetry(() =>
    supabase.from("payment_methods").delete().eq("id", paymentMethodId)
  );

  if (error) throw error;
  return true;
}
