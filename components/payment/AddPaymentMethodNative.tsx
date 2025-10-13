import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { CardField, useConfirmSetupIntent } from "@stripe/stripe-react-native";
import { supabase } from "../../lib/supabase";

interface AddPaymentMethodNativeProps {
  onSaveSuccess: (cardDetails: any) => void;
  onCancel: () => void;
}

/**
 * Native component for adding payment methods on iOS/Android
 * Uses Stripe React Native's CardField for secure card input
 */
const AddPaymentMethodNative: React.FC<AddPaymentMethodNativeProps> = ({
  onSaveSuccess,
  onCancel,
}) => {
  const { confirmSetupIntent } = useConfirmSetupIntent();
  const [cardComplete, setCardComplete] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("US");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveCard = async () => {
    if (
      !cardComplete ||
      !cardholderName ||
      !addressLine1 ||
      !city ||
      !state ||
      !country
    ) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create a SetupIntent via edge function
      const { data: setupData, error: setupError } =
        await supabase.functions.invoke("stripe-customer-api", {
          body: {
            path: "create-setup-intent",
            payload: {},
          },
        });

      if (setupError || !setupData?.clientSecret) {
        throw new Error(setupError?.message || "Failed to create setup intent");
      }

      const clientSecret = setupData.clientSecret;

      // Step 2: Confirm the SetupIntent with card details
      const { error: confirmError, setupIntent } = await confirmSetupIntent(
        clientSecret,
        {
          paymentMethodType: "Card",
          paymentMethodData: {
            billingDetails: {
              name: cardholderName,
              address: {
                line1: addressLine1,
                city: city,
                state: state,
                country: country,
              },
            },
          },
        }
      );

      if (confirmError) {
        throw new Error(
          confirmError.message || "Failed to confirm payment method"
        );
      }

      if (!setupIntent?.paymentMethodId) {
        throw new Error("No payment method ID returned");
      }

      // Step 3: Attach the payment method to customer (backend will handle this)
      const { data: attachData, error: attachError } =
        await supabase.functions.invoke("stripe-customer-api", {
          body: {
            path: "attach-payment-method",
            payload: { paymentMethodId: setupIntent.paymentMethodId },
          },
        });

      if (attachError) {
        throw new Error(attachError.message || "Failed to save payment method");
      }

      // Success! Return card details
      onSaveSuccess({
        card_brand: "card", // CardField doesn't expose brand until after submission
        card_last4: "****", // CardField doesn't expose last4 until after submission
        card_exp_month: 0,
        card_exp_year: 0,
      });

      setLoading(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("[AddPaymentMethodNative] Error:", err);
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Payment Method</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.formContainer}>
        <Text style={styles.label}>Card Information</Text>
        <View style={styles.cardFieldContainer}>
          <CardField
            postalCodeEnabled={true}
            placeholders={{
              number: "4242 4242 4242 4242",
            }}
            cardStyle={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              fontSize: 16,
              placeholderColor: "#999",
            }}
            style={styles.cardField}
            onCardChange={(cardDetails) => {
              setCardComplete(cardDetails.complete);
            }}
          />
        </View>

        <Text style={styles.label}>Cardholder Name *</Text>
        <TextInput
          placeholder="John Doe"
          value={cardholderName}
          onChangeText={setCardholderName}
          style={styles.input}
        />

        <Text style={styles.label}>Billing Address *</Text>
        <TextInput
          placeholder="Address Line 1"
          value={addressLine1}
          onChangeText={setAddressLine1}
          style={styles.input}
          autoComplete="street-address"
        />

        <TextInput
          placeholder="City"
          value={city}
          onChangeText={setCity}
          style={styles.input}
          autoComplete="address-line2"
        />

        <TextInput
          placeholder="State/Province"
          value={state}
          onChangeText={setState}
          style={styles.input}
          autoComplete="address-line1"
        />

        <TextInput
          placeholder="Country Code (e.g., US)"
          value={country}
          onChangeText={(text) => setCountry(text.toUpperCase())}
          style={styles.input}
          maxLength={2}
          autoCapitalize="characters"
          autoComplete="country"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonClose]}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonSave,
            (loading || !cardComplete) && styles.buttonDisabled,
          ]}
          onPress={handleSaveCard}
          disabled={loading || !cardComplete}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Save Card</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
    color: "#333",
  },
  cardFieldContainer: {
    height: 50,
    marginBottom: 10,
  },
  cardField: {
    width: "100%",
    height: 50,
  },
  input: {
    height: 45,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    width: "100%",
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    minWidth: 100,
    marginHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSave: {
    backgroundColor: "#2196F3",
  },
  buttonClose: {
    backgroundColor: "#f44336",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
});

export default AddPaymentMethodNative;
