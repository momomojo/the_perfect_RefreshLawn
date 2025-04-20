import React, { useEffect, useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import Constants from "expo-constants";
import { ActivityIndicator, View, Text, TouchableOpacity } from "react-native";

interface StripePaymentWebProps {
  paymentIntentClientSecret: string; 
  onPaymentSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  onBack?: () => void;
}

// --- Fix Stripe Initialization: Use appropriate environment variables --- 
const publishableKey = Constants.expoConfig?.extra?.stripePublishableKey || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
console.log("Stripe publishable key (StripePaymentWeb):", publishableKey);
if (!publishableKey) {
  console.error(
    "Error: Stripe publishable key is not set in environment variables or Constants.expoConfig."
  );
  // Optionally, you could throw an error or return a component indicating configuration error
}
const stripePromise = loadStripe(publishableKey);

const CheckoutFormComponent: React.FC<StripePaymentWebProps> = ({
  paymentIntentClientSecret, 
  onPaymentSuccess,
  onError,
  onBack,
}) => {
  const stripe = useStripe();
  const elements = useElements(); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe) {
      return;
    }
    const clientSecret = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret"
    );
    if (!clientSecret) {
      return;
    }
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case "succeeded":
          setMessage("Payment succeeded!");
          onPaymentSuccess(paymentIntent.id);
          break;
        case "processing":
          setMessage("Your payment is processing.");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          onError?.("Payment failed: Requires payment method.");
          break;
        default:
          setMessage("Something went wrong.");
          onError?.("Payment failed: Unknown error.");
          break;
      }
    });
  }, [stripe]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!stripe || !elements) {
      setError("Stripe.js has not loaded yet.");
      return;
    }

    setLoading(true);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-complete`, 
      },
    });

    if (submitError) {
      setError(submitError.message || "An unexpected error occurred.");
      onError?.(submitError.message || "An unexpected error occurred.");
    }

    setLoading(false);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}> 
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 500, margin: 'auto' }}>
        {onBack && (
          <TouchableOpacity onPress={handleBack} style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#06d6a0', fontWeight: '600', fontSize: 16 }}>Back</Text>
          </TouchableOpacity>
        )}

        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>Complete Your Payment</Text>

        <PaymentElement id="payment-element" options={{ layout: "tabs" }} />

        <button 
          disabled={loading || !stripe || !elements} 
          id="submit"
          style={{
            width: '100%',
            padding: '14px 0',
            fontSize: 18,
            borderRadius: 8,
            background: (loading || !stripe || !elements) ? '#a3e6e0' : '#06d6a0',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: (loading || !stripe || !elements) ? 'not-allowed' : 'pointer',
            marginTop: 24,
            opacity: (loading || !stripe || !elements) ? 0.6 : 1
          }}
        >
          <span id="button-text">
            {loading ? 
              <ActivityIndicator size="small" color="#fff" /> : 
              "Pay now"
            }
          </span>
        </button>

        {(error || message) && 
          <Text style={{ 
            color: error ? '#ef4444' : '#10b981', 
            marginTop: 16, 
            textAlign: 'center', 
            fontWeight: '500'
          }}>
            {error || message}
          </Text>
        }
      </form>
    </View>
  );
};

const StripePaymentWeb: React.FC<StripePaymentWebProps> = (props) => {
  const options = {
    clientSecret: props.paymentIntentClientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#06d6a0',
        colorBackground: '#ffffff',
        colorText: '#32325d',
      },
    } as const, 
  };

  if (!props.paymentIntentClientSecret) {
     return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#ef4444" }}>Missing Payment Details.</Text>
      </View>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutFormComponent {...props} />
    </Elements>
  );
};

export default StripePaymentWeb;
