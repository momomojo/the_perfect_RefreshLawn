import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { getCustomerBookings } from "../../lib/data";
import { supabase } from "../../lib/supabase";

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
      const data = await getCustomerBookings(userId);

      setBookings(data.data || []);
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

      <View className="flex-1 p-4">
        {bookings.length === 0 ? (
          <Text className="text-gray-500 text-center mt-8">No booking history found.</Text>
        ) : (
          bookings.map((item, idx) => (
            <View key={item.id || idx} className="bg-white border border-gray-200 rounded-lg mb-3 p-4 shadow-sm">
              <Text className="text-lg font-semibold text-gray-800 mb-1">
                {item.service?.name || "Unknown Service"}
              </Text>
              <Text className="text-gray-600 mb-1">
                {item.scheduled_date} {item.scheduled_time}
              </Text>
              <Text className="text-gray-500 mb-1">Status: <Text style={{fontWeight:'bold'}}>{item.status}</Text></Text>
              {item.status === "paid" && item.stripe_payment_intent_id && (
                <View className="mb-2">
                  <Text className="text-xs text-teal-700 font-semibold">Paid via Stripe</Text>
                  <Text className="text-xs text-gray-500">Payment Ref: {item.stripe_payment_intent_id}</Text>
                </View>
              )}
              <Text className="text-gray-500 text-sm">Price: ${parseFloat(item.price?.toString() || '0').toFixed(2)}</Text>
              {item.address && (
                <Text className="text-gray-400 text-xs mt-1">{item.address}</Text>
              )}
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}
