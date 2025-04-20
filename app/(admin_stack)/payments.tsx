import React from "react";
import { SafeAreaView, StatusBar, Alert } from "react-native";
import PaymentManagement from "../components/admin/PaymentManagement";
import { Stack } from "expo-router";
import { showNotification } from "../../lib/notification";
import { useConfirmation } from "../../lib/confirmation";
import { refundPayment } from "../../lib/data";

export default function PaymentsScreen() {
  const { showConfirmation } = useConfirmation();

  // Process refund (placeholder logic)
  const processRefund = async (paymentIntentId: string, amount: number) => {
    showConfirmation({
      title: "Confirm Refund",
      message: `Are you sure you want to refund $${amount.toFixed(
        2
      )} for payment ${paymentIntentId.substring(
        0,
        12
      )}...? This cannot be undone.`,
      confirmText: "Confirm Refund",
      confirmButtonStyle: "destructive",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const result = await refundPayment(paymentIntentId, amount);
          console.log("Refund API call successful:", result);
          showNotification({
            title: "Refund Successful",
            message: `Refund ID: ${result.refundId}. Status: ${result.status}`,
            type: "success",
          });
          // TODO: Optionally refresh the transactions list here
        } catch (error: any) {
          console.error("Refund failed:", error);
          Alert.alert(
            "Refund Error",
            error.message || "An unknown error occurred."
          );
        }
      },
    });
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
