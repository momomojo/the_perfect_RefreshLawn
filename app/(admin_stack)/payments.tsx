import React from "react";
import { SafeAreaView, StatusBar, Alert } from "react-native";
import PaymentManagement from "../components/admin/PaymentManagement";
import { Stack } from "expo-router"; // Import Stack

export default function PaymentsScreen() {
  // Process refund (placeholder logic)
  const processRefund = async (paymentIntentId: string, amount: number) => {
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
            // In a real app, you might update local state or make another API call
            // For simulation, just show success
            Alert.alert("Success", `Simulated refund for ${paymentIntentId}`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Add Stack Screen Options */}
      <Stack.Screen options={{ title: "Payments", headerShown: true }} />
      <StatusBar barStyle="light-content" backgroundColor="#15803d" />
      <PaymentManagement onRefund={processRefund} />
    </SafeAreaView>
  );
}
