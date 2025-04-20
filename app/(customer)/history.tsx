import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { getCustomerBookings } from "../../lib/data";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { Linking } from "react-native";
import { showNotification } from "../../lib/notification";
import { WebView } from "react-native-webview";

export default function HistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  // Receipt modal state
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchBookingHistory();
  }, []);

  const fetchBookingHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setError("You must be logged in to view booking history");
        setLoading(false);
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

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "EEE, MMM d, yyyy");
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      return format(new Date(`2000-01-01T${timeStr}`), "h:mm a");
    } catch (e) {
      return timeStr;
    }
  };

  // Handler to fetch and open the Stripe receipt URL
  const handleViewReceipt = async (paymentIntentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "stripe-payment-api",
        { body: { path: "get-receipt-url", payload: { paymentIntentId } } }
      );
      if (error) throw error;
      if (data?.receiptUrl) {
        // Show receipt in-app
        setReceiptUrl(data.receiptUrl);
      } else {
        showNotification({ title: "Error", message: "Receipt not available", type: "error" });
      }
    } catch (err: any) {
      console.error("Error fetching receipt URL:", err);
      showNotification({ title: "Error", message: err.message || "Failed to fetch receipt", type: "error" });
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-4 text-gray-600">Loading service history...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center p-4">
        <Text className="text-red-500 text-lg mb-4 text-center">{error}</Text>
        <TouchableOpacity
          className="bg-green-600 px-4 py-2 rounded-lg"
          onPress={fetchBookingHistory}
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      {receiptUrl && (
        <Modal visible animationType="slide" onRequestClose={() => setReceiptUrl(null)}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => setReceiptUrl(null)} style={{ padding: 16 }}>
              <Text style={{ color: '#06d6a0', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
            <WebView source={{ uri: receiptUrl! }} style={{ flex: 1 }} />
          </View>
        </Modal>
      )}
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen
          options={{
            title: "Service History",
            headerShadowVisible: false,
            headerStyle: { backgroundColor: "white" },
            headerTitleAlign: "center",
          }}
        />
        <ScrollView className="flex-1 p-4">
          {bookings.length === 0 ? (
            <View className="flex-1 justify-center items-center mt-20">
              <Text className="text-gray-500 text-center">
                No booking history found.
              </Text>
            </View>
          ) : (
            bookings.map((item) => (
              <TouchableOpacity
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg mb-3 p-4 shadow-sm active:bg-gray-100"
                onPress={() =>
                  router.push(`/(customer)/booking-details/${item.id}`)
                }
              >
                <Text className="text-lg font-semibold text-gray-800 mb-1">
                  {item.service?.name || "Unknown Service"}
                </Text>
                <Text className="text-gray-600 mb-1">
                  {formatDate(item.scheduled_date)} at{" "}
                  {formatTime(item.scheduled_time)}
                </Text>
                <Text className="text-gray-500 mb-1 capitalize">
                  Status:{" "}
                  <Text className="font-bold">
                    {item.status.replace(/_/g, " ")}
                  </Text>
                </Text>
                <Text className="text-gray-500 text-sm font-semibold">
                  Price: ${parseFloat(item.price?.toString() || "0").toFixed(2)}
                </Text>
                {item.address && (
                  <Text className="text-gray-400 text-xs mt-1">
                    {item.address}
                  </Text>
                )}
                {item.stripe_payment_intent_id && (
                  <View className="mt-2 pt-1 border-t border-gray-100">
                    <Text className="text-xs text-gray-500">
                      Payment Ref: {item.stripe_payment_intent_id}
                    </Text>
                    <TouchableOpacity onPress={() => handleViewReceipt(item.stripe_payment_intent_id)}>
                      <Text className="text-blue-500 text-xs font-semibold mt-1">View Receipt</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
