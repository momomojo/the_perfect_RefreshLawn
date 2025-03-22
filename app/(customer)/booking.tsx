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

  const handleBookingComplete = async (bookingData: BookingFormData) => {
    try {
      setSubmitting(true);
      setError(null);

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create a new booking
      const newBooking: Omit<Booking, "id" | "created_at" | "updated_at"> = {
        customer_id: user.id,
        service_id: bookingData.serviceId,
        status: "pending", // All new bookings start as pending
        price: bookingData.price,
        scheduled_date: bookingData.date,
        scheduled_time: bookingData.time,
        address: bookingData.address,
        recurring_plan_id: bookingData.isRecurring
          ? bookingData.recurringPlan
          : undefined,
        notes: "Customer booking from app",
      };

      console.log("Creating booking with data:", newBooking);

      // Submit to Supabase
      const booking = await createBooking(newBooking);

      // Show success message
      Alert.alert(
        "Booking Successful!",
        "Your service has been booked. You will receive a confirmation soon.",
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
