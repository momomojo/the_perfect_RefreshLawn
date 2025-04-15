import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import BookingForm from "../components/customer/BookingForm";
import StripePaymentWeb from "../../components/payment/StripePaymentWeb";
import {
  getService,
  createBooking,
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
  const [pendingBooking, setPendingBooking] = useState<BookingFormData | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (serviceId) {
      fetchServiceAndUserData();
    } else {
      // Redirect to services page instead of showing an error
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

      // Get current user's session
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      // Fetch service details
      const serviceData = await getService(serviceId as string);
      setService(serviceData);

      // Fetch user profile
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

  // Step 1: User submits booking form, trigger payment UI
  const handleBookingComplete = (bookingData: BookingFormData) => {
    setPendingBooking(bookingData);
    setShowPayment(true);
  };

  // Step 2: On successful payment, create booking in Supabase
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!pendingBooking || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const newBooking: Omit<Booking, "id" | "created_at" | "updated_at"> = {
        customer_id: user.id,
        service_id: pendingBooking.serviceId,
        status: "paid", // Mark as paid
        price: pendingBooking.price,
        scheduled_date: pendingBooking.date,
        scheduled_time: pendingBooking.time,
        address: pendingBooking.address,
        recurring_plan_id: pendingBooking.isRecurring
          ? pendingBooking.recurringPlan
          : undefined,
        notes: `Customer booking from app. Stripe PaymentIntent: ${paymentIntentId}`,
        // Optionally add payment_intent_id if your Booking table supports it
      };
      // Submit to Supabase
      await createBooking(newBooking);
      setShowPayment(false);
      setPendingBooking(null);
      // Show success message
      Alert.alert(
        "Booking Successful!",
        "Your service has been booked and payment received. You will receive a confirmation soon.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(customer)/dashboard"),
          },
        ]
      );
    } catch (err: any) {
      console.error("Error creating booking:", err);
      setError(err.message || "Failed to create booking. Please try again.");
      Alert.alert("Error", err.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: If payment fails/cancelled
  const handlePaymentError = (errMsg: string) => {
    setShowPayment(false);
    setPendingBooking(null);
    setError(errMsg || "Payment failed. Please try again.");
    Alert.alert("Payment Error", errMsg || "Payment failed. Please try again.");
  };

  if (loading && serviceId) {
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
    return null; // Return null since we're redirecting
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
            billingDetails={{
              name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}`.trim() : undefined,
              email: user?.email || undefined,
              address: {
                line1: pendingBooking.address,
                // Optionally add city, state, postal_code, country if available
              },
            }}
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
