import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import ServiceHistory from "../components/customer/ServiceHistory";
import { getBookingHistory } from "../lib/data";
import { supabase } from "../../utils/supabase";

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    fetchBookingHistory();
  }, []);

  const fetchBookingHistory = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setError("You must be logged in to view booking history");
        return;
      }

      const userId = session.session.user.id;

      // Fetch booking history
      const { data, error: fetchError } = await getBookingHistory(userId);

      if (fetchError) {
        setError(fetchError.message || "Failed to load booking history");
        return;
      }

      setBookings(data || []);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      console.error("Error fetching booking history:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-4 text-gray-600">Loading service history...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center p-4">
        <Text className="text-red-500 text-lg mb-4">{error}</Text>
        <Text
          className="text-blue-500 font-semibold"
          onPress={fetchBookingHistory}
        >
          Try Again
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Service History",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "white" },
        }}
      />

      <View className="flex-1">
        <ServiceHistory services={bookings} onRefresh={fetchBookingHistory} />
      </View>
    </SafeAreaView>
  );
}
