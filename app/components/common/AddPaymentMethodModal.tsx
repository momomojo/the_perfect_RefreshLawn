import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
// Import from stripe-js for web platform
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../../../lib/supabase";
import AddPaymentMethodNative from "../../../components/payment/AddPaymentMethodNative";

// Check if platform is web
const isWeb = Platform.OS === "web";

// Conditionally import web components
let Elements: any = null;
let CardElement: any = null;
let useStripe: any = null;
let useElements: any = null;

// Only import web components if running on web
if (isWeb) {
  // This dynamic import approach prevents React Native from trying to import web-only modules
  const stripeReactImport = require("@stripe/react-stripe-js");
  Elements = stripeReactImport.Elements;
  CardElement = stripeReactImport.CardElement;
  useStripe = stripeReactImport.useStripe;
  useElements = stripeReactImport.useElements;
}

interface AddPaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess: (cardDetails: any) => void;
  stripePublishableKey: string;
}

// Web-only component for Stripe Elements
const WebCardForm = ({
  onSubmit,
  onCancel,
  loading,
  setCardComplete,
  cardholderName,
  setCardholderName,
  addressLine1,
  setAddressLine1,
  city,
  setCity,
  state,
  setState,
  country,
  setCountry,
  error,
}: any) => {
  const stripe = useStripe();
  const elements = useElements();

  // Modify to use React Native's event system
  const handleSubmit = () => {
    // Basic validation - ensure all required fields are present
    if (
      !stripe ||
      !elements ||
      !cardholderName ||
      !addressLine1 ||
      !city ||
      !state ||
      !country
    ) {
      console.error("Missing required billing details.");
      // Optionally set an error state here to inform the user
      return;
    }

    // Create the payment method
    onSubmit(stripe, elements);
  };

  return (
    <View style={styles.formContainer}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.cardElementContainer}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                fontFamily: "sans-serif",
              },
            },
            // hidePostalCode: true, // Keep postal code in CardElement for simplicity
          }}
          onChange={(e: any) => setCardComplete(e.complete)}
        />
      </View>

      <TextInput
        placeholder="Cardholder Name"
        value={cardholderName}
        onChangeText={setCardholderName}
        style={[styles.input, styles.cardholderInput]}
      />
      <TextInput
        placeholder="Address Line 1"
        value={addressLine1}
        onChangeText={setAddressLine1}
        style={styles.input}
        autoComplete="street-address" // Helps with autofill
      />
      <TextInput
        placeholder="City"
        value={city}
        onChangeText={setCity}
        style={styles.input}
        autoComplete="address-line2" // Changed from address-level2 to satisfy TS
      />
      <TextInput
        placeholder="State/Province"
        value={state}
        onChangeText={setState}
        style={styles.input}
        autoComplete="address-line1" // Changed from address-level1 to satisfy TS
      />
      {/* You might want a Picker or similar for country selection */}
      <TextInput
        placeholder="Country Code (e.g., US)"
        value={country}
        onChangeText={(text) => setCountry(text.toUpperCase())} // Ensure uppercase
        style={styles.input}
        maxLength={2} // ISO 3166-1 alpha-2
        autoCapitalize="characters"
        autoComplete="country" // Helps with autofill
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonClose]}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.textStyle}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonSave,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.textStyle}>Save Card</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// React Native version for non-web platforms
const NativeCardForm = ({ onSaveSuccess, onCancel, error }: any) => {
  return (
    <View style={styles.formContainer}>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <AddPaymentMethodNative
        onSaveSuccess={onSaveSuccess}
        onCancel={onCancel}
      />
    </View>
  );
};

const AddPaymentMethodModal: React.FC<AddPaymentMethodModalProps> = ({
  visible,
  onClose,
  onSaveSuccess,
  stripePublishableKey,
}) => {
  const [cardholderName, setCardholderName] = useState<string>("");
  const [addressLine1, setAddressLine1] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [country, setCountry] = useState<string>(""); // Use 2-letter country code (e.g., 'US')

  const [loading, setLoading] = useState<boolean>(false);
  const [cardComplete, setCardComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<any>(null);

  // Initialize Stripe when component mounts or publishable key changes
  React.useEffect(() => {
    if (isWeb) {
      console.log(
        "Stripe publishable key (AddPaymentMethodModal):",
        stripePublishableKey
      );
      if (!stripePublishableKey) {
        console.error(
          "Error: Missing Stripe publishable key in AddPaymentMethodModal"
        );
        setError("Payment system configuration error. Please contact support.");
        return;
      }
      try {
        setStripePromise(loadStripe(stripePublishableKey));
      } catch (err) {
        console.error("Error initializing Stripe:", err);
        setError(
          "Unable to initialize payment system. Please try again later."
        );
      }
    }
  }, [stripePublishableKey]);

  // --- Enhanced error parsing helper ---
  function parseStripeError(error: any): string {
    if (!error) return "An unexpected error occurred. Please try again.";

    // If error is a string
    if (typeof error === "string") return error;

    // If error has a message
    if (error.message) {
      // Check for Stripe-specific fields
      const code = error.stripe_error_code || error.code;
      const type = error.stripe_error_type || error.type;
      const decline = error.stripe_decline_code || error.decline_code;
      if (code || type || decline) {
        let msg = error.message;
        if (code) msg += `\n(Code: ${code})`;
        if (type) msg += `\n(Type: ${type})`;
        if (decline) msg += `\n(Decline: ${decline})`;
        return msg;
      }
      return error.message;
    }
    // If error is an object with useful fields
    if (
      error.stripe_error_code ||
      error.stripe_error_type ||
      error.stripe_decline_code
    ) {
      let msg = "Payment failed.";
      if (error.stripe_error_code)
        msg += `\n(Code: ${error.stripe_error_code})`;
      if (error.stripe_error_type)
        msg += `\n(Type: ${error.stripe_error_type})`;
      if (error.stripe_decline_code)
        msg += `\n(Decline: ${error.stripe_decline_code})`;
      return msg;
    }
    return JSON.stringify(error);
  }

  const handleSaveCard = async (stripe: any, elements: any) => {
    setLoading(true);
    setError(null);
    try {
      const cardElement = elements.getElement(CardElement);
      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: {
            name: cardholderName,
            address: {
              line1: addressLine1,
              city: city,
              state: state,
              country: country,
              // Postal code is handled by CardElement
            },
          },
        });
      if (stripeError) {
        setError(parseStripeError(stripeError));
        setLoading(false);
        return;
      }
      // Attach payment method to customer
      const { data, error: attachError } = await supabase.functions.invoke(
        "stripe-customer-api",
        {
          body: {
            path: "attach-payment-method",
            payload: { paymentMethodId: paymentMethod.id },
          },
        }
      );
      if (attachError) {
        setError(parseStripeError(attachError));
        setLoading(false);
        return;
      }
      // Extract card details for duplicate check
      const card = paymentMethod.card || paymentMethod.card_details || {};
      const cardDetails = {
        card_brand: card.brand,
        card_last4: card.last4,
        card_exp_month: card.exp_month || card.expiryMonth,
        card_exp_year: card.exp_year || card.expiryYear,
      };
      onSaveSuccess(cardDetails);
      setLoading(false);
      onClose();
    } catch (err) {
      setError(parseStripeError(err));
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCardholderName("");
    setAddressLine1("");
    setCity("");
    setState("");
    setCountry("");
    setCardComplete(false);
    setError(null);
    setLoading(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Add New Payment Method</Text>

          {isWeb ? (
            stripePromise && Elements ? (
              <Elements stripe={stripePromise}>
                <WebCardForm
                  onSubmit={handleSaveCard}
                  onCancel={handleClose}
                  loading={loading}
                  setCardComplete={setCardComplete}
                  cardholderName={cardholderName}
                  setCardholderName={setCardholderName}
                  addressLine1={addressLine1}
                  setAddressLine1={setAddressLine1}
                  city={city}
                  setCity={setCity}
                  state={state}
                  setState={setState}
                  country={country}
                  setCountry={setCountry}
                  error={error}
                />
              </Elements>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Loading payment form...</Text>
              </View>
            )
          ) : (
            <NativeCardForm
              onSaveSuccess={onSaveSuccess}
              onCancel={handleClose}
              error={error}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "90%",
    maxWidth: 500,
  },
  formContainer: {
    width: "100%",
  },
  cardElementContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15, // Increased margin
    backgroundColor: "#fff", // White background for card element
  },
  modalText: {
    marginBottom: 20,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  input: {
    height: 40,
    borderColor: "#ccc", // Lighter border
    borderWidth: 1,
    marginBottom: 15, // Increased margin
    paddingHorizontal: 10,
    borderRadius: 5, // Rounded corners
    backgroundColor: "#fff", // White background
  },
  cardholderInput: {
    // Specific styles for cardholder name if needed
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 25,
    width: "100%",
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    minWidth: 100, // Minimum width for buttons
    marginHorizontal: 5, // Add spacing between buttons
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSave: {
    backgroundColor: "#2196F3",
  },
  buttonClose: {
    backgroundColor: "#f44336", // Red for close/cancel
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  platformWarning: {
    textAlign: "center",
    color: "#888",
    marginVertical: 20,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#4b5563",
  },
});

export default AddPaymentMethodModal;
