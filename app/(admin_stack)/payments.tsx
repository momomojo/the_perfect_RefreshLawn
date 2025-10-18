import React, { useState } from "react";
import { SafeAreaView, StatusBar, Alert, View, Text, TouchableOpacity } from "react-native";
import PaymentManagement from "../components/admin/PaymentManagement";
import InvoiceManagement from "../components/admin/InvoiceManagement";
import RefundRequestManagement from "../components/admin/RefundRequestManagement";
import { Stack } from "expo-router";
import { showNotification } from "../../lib/notification";
import { useConfirmation } from "../../lib/confirmation";
import { refundPayment } from "../../lib/data";

type BillingTab = "payments" | "invoices" | "refunds";

export default function PaymentsScreen() {
  const { showConfirmation } = useConfirmation();
  const [activeTab, setActiveTab] = useState<BillingTab>("payments");

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
      <Stack.Screen options={{ title: "Billing Hub", headerShown: true }} />
      <StatusBar barStyle="light-content" backgroundColor="#15803d" />

      {/* Top-level Tabs */}
      <View className="flex-row bg-white border-b-2 border-gray-200">
        <TouchableOpacity
          className={`flex-1 py-4 ${
            activeTab === "payments" ? "border-b-2 border-green-600" : ""
          }`}
          onPress={() => setActiveTab("payments")}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === "payments" ? "text-green-600" : "text-gray-600"
            }`}
          >
            Payments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-4 ${
            activeTab === "invoices" ? "border-b-2 border-green-600" : ""
          }`}
          onPress={() => setActiveTab("invoices")}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === "invoices" ? "text-green-600" : "text-gray-600"
            }`}
          >
            Invoices
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-4 ${
            activeTab === "refunds" ? "border-b-2 border-green-600" : ""
          }`}
          onPress={() => setActiveTab("refunds")}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === "refunds" ? "text-green-600" : "text-gray-600"
            }`}
          >
            Refund Requests
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === "payments" && <PaymentManagement onRefund={processRefund} />}
      {activeTab === "invoices" && <InvoiceManagement />}
      {activeTab === "refunds" && <RefundRequestManagement />}
    </SafeAreaView>
  );
}
