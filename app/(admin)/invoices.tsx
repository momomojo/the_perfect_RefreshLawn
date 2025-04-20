import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import InvoiceManagement from "../components/admin/InvoiceManagement";
import { Stack } from "expo-router";

export default function InvoicesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ title: "Invoices", headerShown: true }} />
      <StatusBar barStyle="light-content" backgroundColor="#15803d" />
      <InvoiceManagement />
    </SafeAreaView>
  );
}
