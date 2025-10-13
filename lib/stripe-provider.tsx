import React, { useEffect } from "react";
import { Platform } from "react-native";
import { StripeProvider as NativeStripeProvider } from "@stripe/stripe-react-native";
import Constants from "expo-constants";

interface StripeProviderWrapperProps {
  children: React.ReactNode;
}

// Get Stripe publishable key from environment
const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  Constants.expoConfig?.extra?.stripePublishableKey ||
  "";

/**
 * Platform-aware Stripe provider wrapper
 * - Native (iOS/Android): Uses @stripe/stripe-react-native StripeProvider
 * - Web: No provider needed (Stripe.js loaded directly in components)
 */
export const StripeProviderWrapper: React.FC<StripeProviderWrapperProps> = ({
  children,
}) => {
  useEffect(() => {
    if (!STRIPE_PUBLISHABLE_KEY) {
      console.error(
        "[StripeProvider] Stripe publishable key is missing. Payment functionality will not work."
      );
    } else {
      console.log("[StripeProvider] Initialized with publishable key");
    }
  }, []);

  // Web platform doesn't need the provider wrapper
  if (Platform.OS === "web") {
    return <>{children}</>;
  }

  // Native platforms (iOS/Android) use the Stripe React Native provider
  return (
    <NativeStripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.lawnrefresh.app" // Required for Apple Pay
      urlScheme="lawnrefresh" // Required for 3D Secure and redirects
    >
      {children}
    </NativeStripeProvider>
  );
};

export default StripeProviderWrapper;
