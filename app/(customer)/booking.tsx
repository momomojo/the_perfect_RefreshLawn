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
import { getServiceById, createBooking, getUserProfile } from "../lib/data";
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
      setError("No service selected");
      setLoading(false);
    }
  }, [serviceId]);

  const fetchServiceAndUserData = async () => {
    try {
      setLoading(true);

      // Fetch service data
      const { data: serviceData, error: serviceError } = await getServiceById(
        serviceId as string
      );

      if (serviceError) {
        setError(serviceError.message || "Failed to load service");
        return;
      }

      if (!serviceData) {
        setError("Service not found");
        return;
      }

      setService(serviceData);

      // Fetch user profile
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: profileData, error: profileError } = await getUserProfile(
          session.session.user.id
        );

        if (!profileError && profileData) {
          setUserProfile(profileData);
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

      // Format the booking data for submission
      const newBooking = {
        customer_id: userId,
        service_id: service.id,
        status: "pending",
        scheduled_date: new Date(
          `${bookingData.date} ${bookingData.time}`
        ).toISOString(),
        address: bookingData.address || userProfile?.address,
        price: service.price,
        is_recurring: bookingData.isRecurring,
        recurring_frequency: bookingData.recurringPlan,
        payment_method_id: bookingData.paymentMethod,
      };

      const { data, error } = await createBooking(newBooking);

      if (error) {
        Alert.alert("Error", error.message || "Failed to create booking");
        return;
      }

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
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to complete booking");
      console.error("Booking error:", err);
    } finally {
      setSubmitting(false);
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
          onPress={() => router.back()}
        >
          Go Back
        </Text>
      </SafeAreaView>
    );
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
