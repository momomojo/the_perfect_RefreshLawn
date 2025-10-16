import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import BookingForm from "../components/customer/BookingForm";
import StripePayment from "../../components/payment/StripePayment";
import {
  getService,
  getProfile,
  Booking,
  Service,
  Profile,
} from "../../lib/data";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useConfirmation } from "../../lib/confirmation";
import { showNotification } from "../../lib/notification";

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
  notes?: string;
  propertySize?: string;
  areaType?: string;
}

export default function BookingScreen() {
  // ...existing state
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(
    null
  );
  const [ephemeralKeySecret, setEphemeralKeySecret] = useState<string | null>(
    null
  ); // Add state for ephemeral key
  const [customerId, setCustomerId] = useState<string | null>(null); // Add state for customer ID
  const router = useRouter();
  const params = useLocalSearchParams();
  const { serviceId } = params;
  const { user } = useAuth();
  const { showConfirmation } = useConfirmation();
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
      showConfirmation({
        title: "Service Selection Required",
        message: "Please select a service from the services page.",
        confirmText: "OK",
        onConfirm: () => router.replace("/(customer)/services"),
      });
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
      showNotification({
        title: "Error",
        message:
          err.message || "Failed to load service details. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Get Payment Secrets and Show Payment Sheet
  const handleInitiatePayment = async (bookingData: BookingFormData) => {
    if (!user) {
      showNotification({
        title: "Error",
        message: "You must be logged in to book a service",
        type: "error",
      });
      return;
    }

    // Check if this is a cash payment - if so, skip Stripe and create booking directly
    if (bookingData.paymentMethod === "cash") {
      console.log("Cash on Delivery selected - creating booking directly");
      setPendingBooking(bookingData);
      setSubmitting(true);

      const bookingCreated = await handleCreateBookingRecord(bookingData);

      if (bookingCreated) {
        if (Platform.OS === "web") {
          showNotification({
            title: "Booking Successful!",
            message: "Your service has been booked. Payment will be collected on delivery.",
            type: "success",
          });
          setTimeout(() => {
            router.replace("/(customer)/dashboard");
          }, 2500);
        } else {
          showConfirmation({
            title: "Booking Successful!",
            message: "Your service has been booked. Payment will be collected on delivery.",
            confirmText: "OK",
            onConfirm: () => router.replace("/(customer)/dashboard"),
          });
        }
      }

      setSubmitting(false);
      return;
    }

    // For card payments, proceed with Stripe payment flow
    setPendingBooking(bookingData); // Store booking details for later
    setSubmitting(true);
    setError(null);
    setPaymentClientSecret(null); // Reset secrets
    setEphemeralKeySecret(null);
    setCustomerId(null);

    try {
      console.log("Fetching payment secrets...");
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

      // Call the 'create-payment-intent' endpoint
      const { data: paymentData, error: paymentError } =
        await supabase.functions.invoke("stripe-payment-api", {
          body: {
            path: "create-payment-intent",
            payload: {
              amount: Math.round(bookingData.price * 100), // Send amount in cents
              currency: "usd",
              paymentMethodId: bookingData.paymentMethod.startsWith("pm_")
                ? bookingData.paymentMethod
                : undefined,
              // Booking metadata
              serviceId: bookingData.serviceId,
              bookingPrice: bookingData.price,
              scheduledDate: bookingData.date,
              scheduledTime: bookingData.time,
              address: bookingData.address,
              notes: bookingData.notes,
              propertySize: bookingData.propertySize,
              areaType: bookingData.areaType,
            },
          },
        });

      if (paymentError) {
        console.error(
          "Error invoking stripe-payment-api (create-payment-intent):",
          paymentError
        );
        throw new Error(
          paymentError.message || "Failed to initialize payment."
        );
      }

      if (
        !paymentData ||
        !paymentData.paymentIntentClientSecret ||
        !paymentData.ephemeralKeySecret ||
        !paymentData.customerId
      ) {
        console.error(
          "Invalid response from create-payment-intent:",
          paymentData
        );
        throw new Error("Received incomplete payment details from server.");
      }

      // Store the secrets in state
      console.log("Payment secrets received:", paymentData);
      setPaymentClientSecret(paymentData.paymentIntentClientSecret);
      setEphemeralKeySecret(paymentData.ephemeralKeySecret);
      setCustomerId(paymentData.customerId);
      setShowPayment(true); // Show the payment component
    } catch (err: any) {
      console.error("Error initiating payment:", err);
      setError(err.message || "Failed to initialize payment");
      setShowPayment(false); // Ensure payment component is hidden on error
      showNotification({
        title: "Error",
        message:
          err.message || "Failed to initialize payment. Please try again.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Create Booking Record (for cash payments or after successful card payment)
  const handleCreateBookingRecord = async (bookingData?: BookingFormData) => {
    // Use provided bookingData or fall back to pendingBooking state
    const dataToUse = bookingData || pendingBooking;

    if (!dataToUse || !user) {
      console.error("Missing pending booking data or user session.");
      setError("Failed to save booking details after payment.");
      showNotification({
        title: "Error",
        message: "Could not save booking details. Please contact support.",
        type: "error",
      });
      return false; // Indicate failure
    }

    console.log("Creating booking record...");
    setSubmitting(true); // Indicate processing

    try {
      // Get the current session token
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Authentication session lost before saving booking.");
      }

      // Insert booking directly into database
      const bookingInsert = {
        customer_id: user.id,
        service_id: dataToUse.serviceId,
        scheduled_date: dataToUse.date,
        scheduled_time: dataToUse.time,
        address: dataToUse.address,
        price: dataToUse.price,
        status: dataToUse.paymentMethod === "cash" ? "pending_payment" : "payment_confirmed",
        notes: dataToUse.notes,
        property_size: dataToUse.propertySize,
        area_type: dataToUse.areaType,
        recurring_plan_id: dataToUse.recurringPlan || null,
      };

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert(bookingInsert)
        .select()
        .single();

      if (bookingError) {
        console.error("Error inserting booking:", bookingError);
        throw new Error(bookingError.message || "Failed to create booking record.");
      }

      if (!booking) {
        throw new Error("Booking was not created.");
      }

      console.log("Booking record created successfully:", booking.id);
      return true; // Indicate success
    } catch (err: any) {
      console.error("Error creating booking record:", err);
      setError(err.message || "Failed to save booking.");
      showNotification({
        title: "Booking Creation Error",
        message:
          err.message ||
          "Could not save booking details. Please contact support.",
        type: "error",
      });
      return false; // Indicate failure
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    console.log(`Payment successful for PaymentIntent: ${paymentIntentId}`);

    // Now that payment is confirmed client-side, create the actual booking record
    const bookingCreated = await handleCreateBookingRecord();

    if (bookingCreated) {
      // Booking record saved, proceed with success flow
      setShowPayment(false);
      setPendingBooking(null);
      setPaymentClientSecret(null); // Clear secrets
      setEphemeralKeySecret(null);
      setCustomerId(null);

      if (Platform.OS === "web") {
        showNotification({
          title: "Booking Successful!",
          message:
            "Your service has been booked and payment processed. You will receive a confirmation soon.",
          type: "success",
        });
        setTimeout(() => {
          router.replace("/(customer)/dashboard");
        }, 2500);
      } else {
        showConfirmation({
          title: "Booking Successful!",
          message:
            "Your service has been booked and payment processed. You will receive a confirmation soon.",
          confirmText: "OK",
          onConfirm: () => router.replace("/(customer)/dashboard"),
        });
      }
    } else {
      // Booking creation failed after payment - this is a critical error state
      // Keep payment UI hidden, error state is already set by handleCreateBookingRecord
      setShowPayment(false);
      // Optionally, provide specific guidance or keep the user on the page
      showConfirmation({
        title: "Action Required",
        message:
          "Payment was successful, but saving the booking failed. Please contact support with Payment Intent ID: " +
          paymentIntentId,
        confirmText: "OK",
        onConfirm: () => {},
      });
    }
  };

  const handlePaymentError = (errMsg: string) => {
    setShowPayment(false);
    setPendingBooking(null);
    setPaymentClientSecret(null); // Clear secrets
    setEphemeralKeySecret(null);
    setCustomerId(null);
    setError(errMsg || "Payment failed. Please try again.");

    if (Platform.OS === "web") {
      showNotification({
        title: "Payment Error",
        message: errMsg || "Payment failed. Please try again.",
        type: "error",
      });
      setError(errMsg || "Payment failed. Please try again.");
    } else {
      showNotification({
        title: "Payment Error",
        message: errMsg || "Payment failed. Please try again.",
        type: "error",
      });
    }
  };

  const handleCancelBooking = () => {
    showConfirmation({
      title: "Cancel Booking",
      message: "Are you sure you want to cancel this booking process?",
      confirmText: "Yes, Cancel",
      onConfirm: () => {
        console.log("Booking cancelled by user.");
        router.back(); // Navigate back if confirmed
      },
    });
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
        {showPayment && paymentClientSecret && pendingBooking ? (
          <StripePayment
            paymentIntentClientSecret={paymentClientSecret}
            ephemeralKeySecret={ephemeralKeySecret || undefined}
            customerId={customerId || undefined}
            publishableKey={publishableKey || undefined}
            onPaymentSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onBack={() => setShowPayment(false)}
          />
        ) : (
          <BookingForm
            service={service}
            userProfile={userProfile}
            onComplete={handleInitiatePayment} // Call handleInitiatePayment instead
            isSubmitting={submitting}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
