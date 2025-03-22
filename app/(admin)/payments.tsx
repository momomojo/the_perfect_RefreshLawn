import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import PaymentManagement from "../components/admin/PaymentManagement";
import { supabase } from "../../lib/supabase";
import { Booking } from "../../lib/data";
import { format } from "date-fns";

export default function PaymentsScreen() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      // Fetch bookings with related data
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          profiles!bookings_customer_id_fkey(first_name, last_name),
          services(name)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Format transactions for PaymentManagement component
      const formattedTransactions = data.map((booking) => ({
        id: booking.stripe_payment_intent_id || `BK-${booking.id.slice(0, 6)}`,
        date: format(new Date(booking.created_at), "yyyy-MM-dd"),
        customer:
          `${booking.profiles?.first_name || ""} ${
            booking.profiles?.last_name || ""
          }`.trim() || "Unknown Customer",
        amount: Number(booking.price),
        status: mapBookingStatusToPaymentStatus(booking.status),
        type: booking.recurring_plan_id ? "subscription" : "one-time",
        service: booking.services?.name || "Unknown Service",
      }));

      setTransactions(formattedTransactions);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Map booking status to payment status
  const mapBookingStatusToPaymentStatus = (bookingStatus) => {
    switch (bookingStatus) {
      case "completed":
        return "completed";
      case "cancelled":
        return "refunded";
      case "pending":
        return "pending";
      case "in_progress":
        return "completed";
      default:
        return "pending";
    }
  };

  // Process refund (in production would connect to Stripe)
  const processRefund = async (paymentIntentId, amount) => {
    Alert.alert(
      "Process Refund",
      `In production, this would process a refund of $${amount} via Stripe API for payment ${paymentIntentId}.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Simulate Refund",
          onPress: async () => {
            try {
              // Extract booking ID from the transaction ID
              const bookingId = paymentIntentId.startsWith("BK-")
                ? paymentIntentId.substring(3)
                : null;

              if (bookingId) {
                // Update booking status to cancelled
                const { error } = await supabase
                  .from("bookings")
                  .update({ status: "cancelled" })
                  .eq("id", bookingId);

                if (error) throw error;

                Alert.alert("Success", "Refund simulated successfully");
                fetchTransactions(); // Refresh transactions
              } else {
                Alert.alert(
                  "Error",
                  "Could not determine booking from payment ID"
                );
              }
            } catch (err) {
              console.error("Error processing refund:", err);
              Alert.alert("Error", err.message || "Failed to process refund");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#15803d" />
        <Text className="mt-3">Loading payment transactions...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center p-4">
        <Text className="text-red-500 text-center mb-4">
          Error loading transactions: {error}
        </Text>
        <Text className="text-blue-500" onPress={fetchTransactions}>
          Retry
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#15803d" />
      <PaymentManagement transactions={transactions} onRefund={processRefund} />
    </SafeAreaView>
  );
}
