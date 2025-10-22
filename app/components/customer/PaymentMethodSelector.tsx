import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { supabase } from '../../../lib/supabase';
import { CreditCard, Check } from 'lucide-react-native';

const isWeb = Platform.OS === 'web';

interface PaymentMethodSelectorProps {
  onPaymentMethodSelected: (paymentMethodId: string, isCash?: boolean) => void;
  onError?: (error: string) => void;
  onBack?: () => void;
}

// Stripe publishable key
const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

if (!publishableKey) {
  console.error('Missing Stripe publishable key');
}

const stripePromise = isWeb ? loadStripe(publishableKey) : null;

/**
 * PaymentElementForm - Handles the actual Payment Element and submission
 */
const PaymentElementForm: React.FC<{
  setupIntentClientSecret: string;
  onComplete: (paymentMethodId: string) => void;
  onError: (error: string) => void;
  onBack?: () => void;
}> = ({ setupIntentClientSecret, onComplete, onError, onBack }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Confirm the setup (save the payment method)
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          // No return_url needed - we handle success inline
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setMessage(confirmError.message || 'Failed to save payment method');
        onError(confirmError.message || 'Failed to save payment method');
        setLoading(false);
        return;
      }

      if (setupIntent?.status === 'succeeded' && setupIntent.payment_method) {
        console.log(
          '✅ Payment method saved successfully:',
          setupIntent.payment_method
        );

        // Get the payment method ID (could be string or object)
        const paymentMethodId =
          typeof setupIntent.payment_method === 'string'
            ? setupIntent.payment_method
            : setupIntent.payment_method.id;

        setMessage('Payment method saved successfully!');
        onComplete(paymentMethodId);
      } else {
        setMessage('Unable to save payment method. Please try again.');
        onError('Setup intent status: ' + setupIntent?.status);
      }
    } catch (err: any) {
      console.error('Payment method setup error:', err);
      setMessage(err.message || 'An unexpected error occurred');
      onError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          className="mb-4 flex-row items-center"
        >
          <Text className="text-base font-semibold text-green-600">← Back</Text>
        </TouchableOpacity>
      )}

      <Text className="mb-2 text-xl font-bold">Payment Method</Text>
      <Text className="mb-6 text-gray-600">
        Select a saved card or add a new payment method
      </Text>

      <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
        {/* @ts-ignore - PaymentElement is a web component */}
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card'],
          }}
        />
      </View>

      {message && (
        <Text
          className={`mb-4 text-center ${
            message.includes('successfully') ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message}
        </Text>
      )}

      <TouchableOpacity
        className={`items-center rounded-lg bg-green-500 py-4 ${
          loading || !stripe || !elements ? 'opacity-50' : ''
        }`}
        onPress={handleSubmit}
        disabled={loading || !stripe || !elements}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-lg font-bold text-white">Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

/**
 * PaymentMethodSelector - Main component that handles setup intent creation
 * and renders the payment element
 */
const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  onPaymentMethodSelected,
  onError = () => {},
  onBack,
}) => {
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCashOption, setShowCashOption] = useState(true);

  useEffect(() => {
    createSetupIntent();
  }, []);

  const createSetupIntent = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Creating SetupIntent for payment method selection...');

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication session not found');
      }

      // Call stripe-customer-api to create a SetupIntent
      const { data, error: functionError } = await supabase.functions.invoke(
        'stripe-customer-api',
        {
          body: { path: 'create-setup-intent' },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (!data?.clientSecret) {
        throw new Error('No client secret returned from setup intent creation');
      }

      console.log('✅ SetupIntent created successfully');
      setSetupIntentClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error('Error creating SetupIntent:', err);
      const errorMessage =
        err.message || 'Failed to initialize payment method selector';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodComplete = (paymentMethodId: string) => {
    console.log('Payment method selected:', paymentMethodId);
    onPaymentMethodSelected(paymentMethodId, false);
  };

  const handleCashSelection = () => {
    console.log('Cash on Delivery selected');
    onPaymentMethodSelected('cash', true);
  };

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-4">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-4 text-gray-600">Loading payment options...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-4">
        <Text className="mb-4 text-center text-red-600">{error}</Text>
        <TouchableOpacity
          className="rounded-lg bg-green-500 px-6 py-3"
          onPress={createSetupIntent}
        >
          <Text className="font-semibold text-white">Retry</Text>
        </TouchableOpacity>
        {onBack && (
          <TouchableOpacity className="mt-4" onPress={onBack}>
            <Text className="text-gray-600">Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Web platform with Stripe Elements
  if (isWeb && setupIntentClientSecret && stripePromise) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Cash Option */}
        {showCashOption && (
          <View className="border-b border-gray-200 bg-white p-4">
            <TouchableOpacity
              className="flex-row items-center justify-between rounded-lg bg-gray-50 p-4"
              onPress={handleCashSelection}
            >
              <View className="flex-row items-center">
                <View className="mr-3 rounded-full bg-green-100 p-2">
                  <CreditCard size={24} color="#16a34a" />
                </View>
                <Text className="text-lg font-semibold">Cash on Delivery</Text>
              </View>
              <Check size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Stripe Payment Element */}
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: setupIntentClientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#16a34a',
                colorBackground: '#ffffff',
                colorText: '#32325d',
              },
            },
          }}
        >
          <PaymentElementForm
            setupIntentClientSecret={setupIntentClientSecret}
            onComplete={handlePaymentMethodComplete}
            onError={onError}
            onBack={onBack}
          />
        </Elements>
      </View>
    );
  }

  // Native platform (iOS/Android) - fallback
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-4">
      <Text className="mb-4 text-center text-gray-600">
        Native payment method selection coming soon.
      </Text>
      <Text className="text-center text-sm text-gray-500">
        For now, please use Cash on Delivery or use the web version.
      </Text>
      {onBack && (
        <TouchableOpacity
          className="mt-6 rounded-lg bg-gray-200 px-6 py-3"
          onPress={onBack}
        >
          <Text className="font-semibold text-gray-700">Go Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default PaymentMethodSelector;
