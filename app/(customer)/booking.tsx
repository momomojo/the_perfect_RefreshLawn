import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import BookingForm from "../components/customer/BookingForm";
import StripePaymentWeb from "../../components/payment/StripePaymentWeb";
import Toast from "react-native-toast-message";
import {
  getService,
  getProfile,
  Booking,
  Service,
  Profile,
} from "../../lib/data";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

interface BookingFormData {
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  address: string;
  isRecurring: boolean;
  recurringPlan?: string;
  paymentMethod: string;
  price: number;
  paymentMethodDetails?: any;
}

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { serviceId } = params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [pendingBooking, setPendingBooking] = useState<BookingFormData | null>(
    null
  );
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (serviceId) {
      fetchServiceAndUserData();
    } else {
      Alert.alert(
        "Service Selection Required",
        "Please select a service from the services page.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(customer)/services"),
          },
        ]
      );
    }
  }, [serviceId]);

  const fetchServiceAndUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const serviceData = await getService(serviceId as string);
      setService(serviceData);

      const profileData = await getProfile(user.id);
      setUserProfile(profileData);
    } catch (err: any) {
      console.error("Error fetching service data:", err);
      setError(err.message || "Failed to load service details");
      Alert.alert(
        "Error",
        err.message || "Failed to load service details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBookingComplete = async (bookingData: BookingFormData) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to book a service");
      return;
    }

    setPendingBooking(bookingData);
    setSubmitting(true);
    setError(null);

    try {
      if (
        bookingData.paymentMethod === "cash" ||
        bookingData.paymentMethod.startsWith("pm_")
      ) {
        console.log("Invoking stripe-payment-api with data:", {
          serviceId: bookingData.serviceId,
          paymentMethod: bookingData.paymentMethod,
          price: bookingData.price,
        });

        // Get the current session token
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error(
            "Authentication session not found: " +
              (sessionError?.message || "No session")
          );
        }

        const { data, error } = await supabase.functions.invoke(
          "stripe-payment-api",
          {
            body: {
              path: "create-booking-and-charge",
              payload: {
                serviceId: bookingData.serviceId,
                date: bookingData.date,
                time: bookingData.time,
                address: bookingData.address,
                isRecurring: bookingData.isRecurring,
                recurringPlanId: bookingData.recurringPlan,
                paymentMethodId: bookingData.paymentMethod,
                price: bookingData.price,
              },
            },
            // Explicitly set the Authorization header with the access token
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (error) {
          console.error("Edge function error details:", error);
          throw new Error(error.message || "Failed to process booking");
        }

        console.log("Edge function response:", data);

        setShowPayment(false);
        setPendingBooking(null);

        // On web, we don't use Alert for success message and navigation
        if (Platform.OS === 'web') {
          Toast.show({
            type: 'success',
            text1: 'Booking Successful!',
            text2: bookingData.paymentMethod === "cash"
              ? "Your service has been booked. Please have cash ready for the service provider."
              : "Your service has been booked and payment processed. You will receive a confirmation soon.",
            visibilityTime: 2500,
          });
          setTimeout(() => {
            router.replace("/(customer)/dashboard");
          }, 2500);
        } else {
          // Use Alert for native platforms
          Alert.alert(
            "Booking Successful!",
            bookingData.paymentMethod === "cash"
              ? "Your service has been booked. Please have cash ready for the service provider."
              : "Your service has been booked and payment processed. You will receive a confirmation soon.",
            [
              {
                text: "OK",
                onPress: () => router.replace("/(customer)/dashboard"),
              },
            ]
          );
        }
      } else {
        setShowPayment(true);
      }
    } catch (err: any) {
      console.error("Error creating booking:", err);
      setError(err.message || "Failed to create booking. Please try again.");
      Alert.alert("Error", err.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!pendingBooking || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      // NOTE: The booking is already created by the handleCreateBookingAndCharge edge function
      // in 'pending_payment' status. The webhook (handlePaymentIntentSucceeded) is responsible
      // for updating the status to 'payment_confirmed'.
      // We don't need to create or update the booking here anymore after simple payment success.

      // We just need to clear the pending state and navigate.
      setShowPayment(false);
      setPendingBooking(null);

      // On web, directly navigate without Alert
      if (Platform.OS === 'web') {
        Toast.show({
          type: 'success',
          text1: 'Payment Successful!',
          text2: 'Your payment is processing. You will receive a confirmation once the booking is fully confirmed.',
          visibilityTime: 2500,
        });
        setTimeout(() => {
          router.replace("/(customer)/dashboard");
        }, 2500);
      } else {
        // Use Alert for native platforms
        Alert.alert(
          "Payment Successful!",
          "Your payment is processing. You will receive a confirmation once the booking is fully confirmed.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(customer)/dashboard"),
            },
          ]
        );
      }
    } catch (err: any) {
      // This catch block might be less relevant now if we're not doing DB operations here
      console.error("Error post-payment processing:", err);
      setError(err.message || "An error occurred after payment.");
      Alert.alert("Error", err.message || "An error occurred after payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentError = (errMsg: string) => {
    setShowPayment(false);
    setPendingBooking(null);
    setError(errMsg || "Payment failed. Please try again.");
    
    // Show error differently based on platform
    if (Platform.OS === 'web') {
      Toast.show({
        type: 'error',
        text1: 'Payment Error',
        text2: errMsg || "Payment failed. Please try again.",
        visibilityTime: 2500,
      });
      setError(errMsg || "Payment failed. Please try again.");
    } else {
      Alert.alert("Payment Error", errMsg || "Payment failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-4 text-gray-600">Loading service details...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center p-4">
        <Text className="text-red-500 text-lg mb-4">{error}</Text>
        <Text
          className="text-blue-500 font-semibold"
          onPress={() => router.replace("/(customer)/services")}
        >
          Go to Services
        </Text>
      </SafeAreaView>
    );
  }

  if (!serviceId) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: "Book a Service",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#F9FAFB" },
        }}
      />

      <View className="flex-1">
        {showPayment && pendingBooking ? (
          <StripePaymentWeb
            amount={Math.round(pendingBooking.price * 100)} // Convert dollars to cents for Stripe
            currency="usd"
            onPaymentSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onBack={() => setShowPayment(false)}
          />
        ) : (
          <BookingForm
            service={service}
            userProfile={userProfile}
            onComplete={handleBookingComplete}
            isSubmitting={submitting}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
