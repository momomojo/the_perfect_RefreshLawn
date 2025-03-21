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
import { getService, createBooking, getProfile } from "../../lib/data";
import { supabase } from "../../utils/supabase";

interface BookingData {
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
  const { serviceId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

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
            text: "Go to Services",
            onPress: () => router.replace("/(customer)/services"),
          },
        ]
      );
    }
  }, [serviceId]);

  const fetchServiceAndUserData = async () => {
    try {
      setLoading(true);

      // Fetch service data
      const serviceData = await getService(serviceId as string);

      if (!serviceData) {
        setError("Service not found");
        return;
      }

      setService(serviceData);

      // Fetch user profile
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        try {
          const profileData = await getProfile(session.session.user.id);
          setUserProfile(profileData);
        } catch (profileError: any) {
          console.error("Error fetching profile:", profileError);
          // Continue without profile data
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingComplete = async (bookingData: BookingData) => {
    try {
      setSubmitting(true);

      // Get current user
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        Alert.alert("Error", "You must be logged in to book a service");
        return;
      }

      const userId = session.session.user.id;

      // Extract date and time separately to match database schema
      const dateString = bookingData.date;
      const timeString = bookingData.time;

      // Format the booking data for submission
      const newBooking = {
        customer_id: userId,
        service_id: bookingData.serviceId || service.id, // Use the selected service ID
        status: "pending" as "pending" | "scheduled" | "in_progress" | "completed" | "cancelled",
        scheduled_date: dateString,
        scheduled_time: timeString, // Add the scheduled_time field that was missing
        address: bookingData.address || userProfile?.address,
        price: bookingData.price || service.base_price,
        recurring_plan_id: bookingData.isRecurring ? bookingData.recurringPlan : undefined,
        payment_method_id: bookingData.paymentMethod,
      };

      // Log the booking data we're about to submit
      console.log("Submitting booking:", newBooking);

      try {
        const bookingData = await createBooking(newBooking);
        
        // Successful booking - show confirmation
        Alert.alert(
          "Booking Confirmed",
          "Your booking has been successfully created!",
          [
            {
              text: "View Bookings",
              onPress: () => router.replace("/(customer)/history"),
            },
            {
              text: "Return to Dashboard",
              onPress: () => router.replace("/(customer)/dashboard"),
            },
          ]
        );
      } catch (error: any) {
        // Handle the error thrown by createBooking
        Alert.alert("Error", error.message || "Failed to create booking");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to complete booking");
      console.error("Booking error:", err);
    } finally {
      setSubmitting(false);
    }
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
        <BookingForm
          service={service}
          userProfile={userProfile}
          onComplete={handleBookingComplete}
          isSubmitting={submitting}
        />
      </View>
    </SafeAreaView>
  );
}