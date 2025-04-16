import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../lib/auth";
import { getBooking, Booking } from "../../lib/data";
import { Calendar, Clock, MapPin, DollarSign, Info } from "lucide-react-native";
import { format } from "date-fns";

export default function BookingDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No booking ID provided");
      setLoading(false);
      return;
    }

    const fetchBookingDetails = async () => {
      try {
        if (!user) {
          throw new Error("User not authenticated");
        }

        const bookingData = await getBooking(id as string);
        if (!bookingData) {
          throw new Error("Booking not found");
        }

        // Check if this booking belongs to the current user
        if (bookingData.customer_id !== user.id) {
          throw new Error("You don't have permission to view this booking");
        }

        setBooking(bookingData);
      } catch (err: any) {
        console.error("Error fetching booking details:", err);
        setError(err.message || "Failed to load booking details");
        Alert.alert("Error", err.message || "Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [id, user]);

  // Format time from 24-hour to 12-hour format
  const formatTime = (timeString?: string) => {
    if (!timeString) return "";
    try {
      const [hours, minutes] = timeString.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, "h:mm a");
    } catch (err) {
      console.error("Error formatting time:", err);
      return timeString;
    }
  };

  // Format date to readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "EEEE, MMMM d, yyyy");
    } catch (err) {
      console.error("Error formatting date:", err);
      return dateString;
    }
  };

  // Status badge color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "scheduled":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      case "paid":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const goBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-4 text-gray-600">Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center p-4">
        <Text className="text-red-500 text-lg mb-4">{error}</Text>
        <TouchableOpacity
          className="bg-green-600 py-2 px-4 rounded-lg"
          onPress={goBack}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: "Booking Details",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#F9FAFB" },
        }}
      />

      <ScrollView className="flex-1 p-4">
        <View className="bg-white rounded-xl p-4 shadow-md mb-4">
          <Text className="text-2xl font-bold text-gray-800 mb-2">
            {booking?.service?.name || "Unknown Service"}
          </Text>
          
          <View className="flex-row items-center justify-between mb-4">
            <View
              className={`${getStatusColor(
                booking?.status
              )} px-3 py-1 rounded-full`}
            >
              <Text className="text-white font-medium text-xs capitalize">
                {booking?.status || "Unknown"}
              </Text>
            </View>
            <Text className="text-xl font-bold text-gray-800">
              ${booking?.price?.toFixed(2) || "0.00"}
            </Text>
          </View>

          <View className="border-t border-gray-200 pt-4">
            <View className="flex-row items-center mb-3">
              <Calendar size={20} color="#4B5563" />
              <Text className="text-gray-700 ml-2">
                {formatDate(booking?.scheduled_date)}
              </Text>
            </View>

            <View className="flex-row items-center mb-3">
              <Clock size={20} color="#4B5563" />
              <Text className="text-gray-700 ml-2">
                {formatTime(booking?.scheduled_time)}
              </Text>
            </View>

            <View className="flex-row items-start mb-3">
              <MapPin size={20} color="#4B5563" style={{ marginTop: 2 }} />
              <Text className="text-gray-700 ml-2 flex-1">
                {booking?.address || "No address provided"}
              </Text>
            </View>

            {booking?.notes && (
              <View className="flex-row items-start mb-3">
                <Info size={20} color="#4B5563" style={{ marginTop: 2 }} />
                <Text className="text-gray-700 ml-2 flex-1">
                  {booking.notes}
                </Text>
              </View>
            )}

            {booking?.stripe_payment_intent_id && (
              <View className="mb-3 bg-gray-100 p-3 rounded-md">
                <Text className="text-gray-700 font-semibold">Payment Info</Text>
                <Text className="text-gray-600 text-xs mt-1">
                  Payment ID: {booking.stripe_payment_intent_id}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          className="bg-green-600 py-3 px-4 rounded-lg items-center mb-8"
          onPress={goBack}
        >
          <Text className="text-white font-semibold">Return to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
