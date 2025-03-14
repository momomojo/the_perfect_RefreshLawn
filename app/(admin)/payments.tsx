import React from "react";
import { View, Text, SafeAreaView, StatusBar } from "react-native";
import PaymentManagement from "../components/admin/PaymentManagement";

export default function PaymentsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#15803d" />
      <PaymentManagement />
    </SafeAreaView>
  );
}
