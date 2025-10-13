import React from "react";
import { Platform } from "react-native";
import StripePaymentWeb from "./StripePaymentWeb";
import StripePaymentNative from "./StripePaymentNative";

interface StripePaymentProps {
  paymentIntentClientSecret: string;
  ephemeralKeySecret?: string;
  customerId?: string;
  publishableKey?: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  onBack?: () => void;
}

/**
 * Platform-aware Stripe payment component
 * - Web: Uses @stripe/stripe-js and @stripe/react-stripe-js
 * - Native (iOS/Android): Uses @stripe/stripe-react-native
 */
const StripePayment: React.FC<StripePaymentProps> = (props) => {
  if (Platform.OS === "web") {
    return <StripePaymentWeb {...props} />;
  }

  return <StripePaymentNative {...props} />;
};

export default StripePayment;
