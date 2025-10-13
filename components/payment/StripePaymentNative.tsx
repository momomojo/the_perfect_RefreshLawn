import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";

interface StripePaymentNativeProps {
  paymentIntentClientSecret: string;
  ephemeralKeySecret?: string;
  customerId?: string;
  publishableKey?: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  onBack?: () => void;
}

/**
 * Native Stripe payment component for iOS and Android
 * Uses Stripe React Native's PaymentSheet for optimal UX
 */
const StripePaymentNative: React.FC<StripePaymentNativeProps> = ({
  paymentIntentClientSecret,
  ephemeralKeySecret,
  customerId,
  onPaymentSuccess,
  onError,
  onBack,
}) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Initialize the Payment Sheet
  useEffect(() => {
    initializePaymentSheet();
  }, [paymentIntentClientSecret]);

  const initializePaymentSheet = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Lawn Refresh",
        paymentIntentClientSecret: paymentIntentClientSecret,
        // Include customer ephemeral key if available for saved payment methods
        ...(customerId && ephemeralKeySecret
          ? {
              customerId: customerId,
              customerEphemeralKeySecret: ephemeralKeySecret,
            }
          : {}),
        allowsDelayedPaymentMethods: true,
        returnURL: "lawnrefresh://payment-complete",
        appearance: {
          colors: {
            primary: "#06d6a0",
            background: "#ffffff",
            componentBackground: "#f7f7f7",
          },
        },
      });

      if (initError) {
        console.error("[StripePaymentNative] Init error:", initError);
        setError(initError.message || "Failed to initialize payment");
        onError?.(initError.message || "Failed to initialize payment");
        setLoading(false);
        return;
      }

      setReady(true);
      setLoading(false);
      console.log(
        "[StripePaymentNative] Payment sheet initialized successfully"
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[StripePaymentNative] Exception during init:", err);
      setError(errorMessage);
      onError?.(errorMessage);
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // User cancelled or error occurred
        console.error("[StripePaymentNative] Present error:", presentError);
        setError(presentError.message || "Payment failed");
        onError?.(presentError.message || "Payment failed");
        setLoading(false);
        return;
      }

      // Payment successful
      console.log("[StripePaymentNative] Payment successful");

      // Extract payment intent ID from client secret
      const paymentIntentId = paymentIntentClientSecret.split("_secret_")[0];
      onPaymentSuccess(paymentIntentId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[StripePaymentNative] Exception during payment:", err);
      setError(errorMessage);
      onError?.(errorMessage);
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.title}>Complete Your Payment</Text>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06d6a0" />
          <Text style={styles.loadingText}>Preparing payment...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={initializePaymentSheet}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {ready && !loading && (
        <View style={styles.readyContainer}>
          <Text style={styles.infoText}>
            Tap the button below to securely enter your payment details.
          </Text>
          <TouchableOpacity
            onPress={handlePayment}
            style={styles.payButton}
            disabled={loading}
          >
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  backButton: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    color: "#06d6a0",
    fontWeight: "600",
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#32325d",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#06d6a0",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  readyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  payButton: {
    backgroundColor: "#06d6a0",
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
  },
  payButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default StripePaymentNative;
