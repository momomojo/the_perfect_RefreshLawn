import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, SafeAreaView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Elements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Constants from 'expo-constants';
import { showNotification } from '../../lib/notification';

// Load Stripe outside of component render
const publishableKey = Constants.expoConfig?.extra?.stripePublishableKey || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
console.log("Stripe publishable key:", publishableKey);
const stripePromise = loadStripe(publishableKey);

const PaymentCompleteContent: React.FC = () => {
  const stripe = useStripe();
  const params = useLocalSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('Processing payment details...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stripe) {
      setLoading(false);
      setMessage('Error: Stripe.js has not loaded.');
      return;
    }

    // Retrieve the PaymentIntent client secret from the URL query params
    const clientSecret = params.payment_intent_client_secret as string;

    if (!clientSecret) {
      setLoading(false);
      setMessage('Error: Payment details not found in URL.');
      return;
    }

    // Retrieve the PaymentIntent
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      setLoading(false);
      switch (paymentIntent?.status) {
        case 'succeeded':
          setStatus('success');
          setMessage('Payment successful! Redirecting...');
          showNotification({ title: 'Payment Successful', message: 'Your booking is confirmed.', type: 'success' });
          // TODO: Consider triggering booking creation *here* if not already done reliably.
          setTimeout(() => router.replace('/(customer)/dashboard'), 2000); // Redirect after a short delay
          break;
        case 'processing':
          setStatus('processing');
          setMessage('Your payment is processing. We will update you when it is complete.');
          // Redirect or stay depends on desired UX
          // setTimeout(() => router.replace('/(customer)/dashboard'), 3000);
          break;
        case 'requires_payment_method':
          setStatus('error');
          setMessage('Payment failed. Please try again.');
          showNotification({ title: 'Payment Failed', message: 'Please check your payment details and try again.', type: 'error' });
          // Redirect back to booking or dashboard
          setTimeout(() => router.replace('/(customer)/dashboard'), 3000); // Or back to booking page?
          break;
        default:
          setStatus('error');
          setMessage('Something went wrong.');
           showNotification({ title: 'Payment Error', message: 'An unknown error occurred.', type: 'error' });
          setTimeout(() => router.replace('/(customer)/dashboard'), 3000);
          break;
      }
    }).catch(error => {
        setLoading(false);
        setStatus('error');
        setMessage(`Error retrieving payment status: ${error.message}`);
        showNotification({ title: 'Error', message: 'Could not retrieve payment status.', type: 'error' });
        setTimeout(() => router.replace('/(customer)/dashboard'), 3000);
    });
  }, [stripe, params, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      {loading && <ActivityIndicator size="large" color="#06d6a0" style={{ marginBottom: 20 }} />}
      <Text style={{
         fontSize: 18, 
         fontWeight: '500', 
         textAlign: 'center',
         color: status === 'error' ? '#ef4444' : (status === 'success' ? '#10b981' : '#4b5563')
      }}>
        {message}
      </Text>
    </View>
  );
};

const PaymentCompleteScreen: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <Stack.Screen options={{ title: 'Payment Status', headerLeft: () => null }} />
       {/* Wrap content with Elements provider */}
      <Elements stripe={stripePromise}>
        <PaymentCompleteContent />
      </Elements>
    </SafeAreaView>
  );
};

export default PaymentCompleteScreen;
