import React, { useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Constants from "expo-constants";
import { supabase } from '../../lib/supabase'; // Import your Supabase client

interface StripePaymentWebProps {
  amount: number; // in cents
  currency?: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  onBack?: () => void; // Added for navigation
  billingDetails?: {
    name?: string;
    email?: string;
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
    phone?: string;
  };
}

// Load Stripe outside of component render to avoid recreating on every render
const stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

const CheckoutForm: React.FC<StripePaymentWebProps> = ({ amount, currency = "usd", onPaymentSuccess, onError, onBack, billingDetails }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CARD_ELEMENT_OPTIONS = {
    style: {
      base: {
        fontSize: '18px',
        color: '#32325d',
        '::placeholder': {
          color: '#a0aec0',
        },
        padding: '18px 12px',
        backgroundColor: '#fff',
        letterSpacing: '0.025em',
        fontFamily: 'inherit',
      },
      invalid: {
        color: '#fa755a',
      },
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!stripe || !elements) {
      setError("Stripe is not loaded");
      setLoading(false);
      return;
    }

    // Get Supabase session for auth token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData?.session?.access_token) {
      setError("Authentication error. Please log in again.");
      setLoading(false);
      onError && onError("Authentication error.");
      return;
    }

    const token = sessionData.session.access_token;

    // Call Supabase Edge Function using supabase.functions.invoke
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'stripe-api', // Function name
        {
          headers: {
            // Pass the token specifically if your function needs it (optional if using default Supabase client)
            // 'Authorization': `Bearer ${token}` // <-- Usually not needed if invoke handles it
          },
          body: {
             path: 'create-payment-intent', // Route/path within your Edge Function
             payload: { amount, currency }    // Actual data payload for the route
          }
        }
      );

      if (invokeError) throw invokeError;
      if (data.error || !data.clientSecret) { // Check for function-level error
        throw new Error(data.error || "Failed to create payment intent");
      }

      // Confirm card payment
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: billingDetails,
        },
      });

      if (result.error) {
        setError(result.error.message || "Payment failed");
        setLoading(false);
        onError && onError(result.error.message || "Payment failed");
      } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
        setLoading(false);
        onPaymentSuccess(result.paymentIntent.id);
      } else {
        setError("Payment did not succeed");
        setLoading(false);
        onError && onError("Payment did not succeed");
      }
    } catch (error) {
      setError("Failed to create payment intent");
      setLoading(false);
      onError && onError("Failed to create payment intent");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Back Button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            marginBottom: 24,
            background: 'none',
            border: 'none',
            color: '#06d6a0',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {/* Simple left arrow icon using SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>
      )}
      <div
        style={{
          minWidth: 320,
          minHeight: 120,
          padding: '24px 20px',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 24,
        }}
        className="card-container"
      >
        <div style={{ width: '100%', marginBottom: 24 }}>
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 0',
            fontSize: 18,
            borderRadius: 8,
            background: '#06d6a0',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(6,214,160,0.08)',
            transition: 'background 0.2s',
            outline: 'none',
          }}
        >
          {loading ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
        {error && (
          <div style={{ color: '#fa755a', fontWeight: 500, marginTop: 12, textAlign: 'center', fontSize: 16 }}>
            {error}
          </div>
        )}
      </div>
    </form>
  );
};

const StripePaymentWeb: React.FC<StripePaymentWebProps> = (props) => (
  <Elements stripe={stripePromise}>
    <CheckoutForm {...props} />
  </Elements>
);

export default StripePaymentWeb;
