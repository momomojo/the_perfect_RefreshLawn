import React, { useState } from 'react';
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
} from 'react-native';
// Import from stripe-js for web platform
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../../../lib/supabase';

// Check if platform is web
const isWeb = Platform.OS === 'web';

// Conditionally import web components
let Elements: any = null;
let CardElement: any = null;
let useStripe: any = null;
let useElements: any = null;

// Only import web components if running on web
if (isWeb) {
  // This dynamic import approach prevents React Native from trying to import web-only modules
  const stripeReactImport = require('@stripe/react-stripe-js');
  Elements = stripeReactImport.Elements;
  CardElement = stripeReactImport.CardElement;
  useStripe = stripeReactImport.useStripe;
  useElements = stripeReactImport.useElements;
}

interface AddPaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  stripePublishableKey: string;
}

// Web-only component for Stripe Elements
const WebCardForm = ({ onSubmit, onCancel, loading, setCardComplete, cardholderName, setCardholderName, error }: any) => {
  const stripe = useStripe();
  const elements = useElements();

  // Modify to use React Native's event system
  const handleSubmit = () => {
    if (!stripe || !elements || !cardholderName) return;
    
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
                fontSize: '16px',
                color: '#424770',
                fontFamily: 'sans-serif',
              },
            },
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
const NativeCardForm = ({ onCancel, loading, error }: any) => {
  return (
    <View style={styles.formContainer}>
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <Text style={styles.platformWarning}>
        Stripe card input is only available in web mode. Please use the web version to add a payment method.
      </Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonClose]}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.textStyle}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AddPaymentMethodModal: React.FC<AddPaymentMethodModalProps> = ({
  visible,
  onClose,
  onSaveSuccess,
  stripePublishableKey,
}) => {
  const [cardholderName, setCardholderName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [cardComplete, setCardComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<any>(null);
  
  // Initialize Stripe when component mounts or publishable key changes
  React.useEffect(() => {
    if (stripePublishableKey && isWeb) {
      setStripePromise(loadStripe(stripePublishableKey));
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
    if (error.stripe_error_code || error.stripe_error_type || error.stripe_decline_code) {
      let msg = "Payment failed.";
      if (error.stripe_error_code) msg += `\n(Code: ${error.stripe_error_code})`;
      if (error.stripe_error_type) msg += `\n(Type: ${error.stripe_error_type})`;
      if (error.stripe_decline_code) msg += `\n(Decline: ${error.stripe_decline_code})`;
      return msg;
    }
    return JSON.stringify(error);
  }

  const handleSaveCard = async (stripe: any, elements: any) => {
    if (!stripe || !elements || !cardholderName) {
      setError('Please fill in all card details and cardholder name.');
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      
      // Create payment method
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName,
        },
      });

      if (stripeError) {
        throw { ...stripeError, message: stripeError.message || 'Failed to create payment method.' };
      }

      if (!paymentMethod?.id) {
        throw new Error('Payment method ID not received from Stripe.');
      }

      // Attach payment method to customer via Supabase Function
      const { data: attachData, error: attachError } = await supabase.functions.invoke(
        'stripe-customer-api',
        {
          body: {
            path: 'attach-payment-method',
            payload: { paymentMethodId: paymentMethod.id },
          },
        }
      );

      if (attachError) {
        throw { ...attachError, message: attachError.message || 'Failed to attach payment method.' };
      }

      if (attachData?.error) {
        throw { ...attachData, message: attachData.error || 'Server error attaching payment method.' };
      }

      Alert.alert('Success', 'Payment method added successfully!');
      handleClose();
      onSaveSuccess();
    } catch (err: any) {
      console.error('Error saving card:', err);
      setError(parseStripeError(err));
      Alert.alert('Payment Error', parseStripeError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCardholderName('');
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
              onCancel={handleClose}
              loading={loading}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 500,
  },
  formContainer: {
    width: '100%',
  },
  cardElementContainer: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    height: 45,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  cardholderInput: {
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 25,
    width: '100%',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSave: {
    backgroundColor: '#10b981',
  },
  buttonClose: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#4b5563',
  },
  platformWarning: {
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  }
});

export default AddPaymentMethodModal;
