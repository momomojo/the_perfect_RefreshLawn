import React from "react";
import { SafeAreaView, StatusBar, Alert } from "react-native";
import PaymentManagement from "../components/admin/PaymentManagement";
import { Stack } from "expo-router"; // Import Stack

export default function PaymentsScreen() {
  // ... existing processRefund function ...
  const processRefund = async (paymentIntentId: any, amount: any) => {
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
            // ... (keep existing simulation logic)
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
