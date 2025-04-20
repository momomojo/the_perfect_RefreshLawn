import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import CustomerManagement from "../components/admin/CustomerManagement";
import { Stack } from "expo-router"; // Import Stack

export default function CustomersScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Add Stack Screen Options */}
      <Stack.Screen options={{ title: "Customers", headerShown: true }} />
      <StatusBar barStyle="light-content" backgroundColor="#15803d" />
      <CustomerManagement />
    </SafeAreaView>
  );
}
