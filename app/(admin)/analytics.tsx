import React from "react";
import { View, Text, SafeAreaView } from "react-native";
import { Stack } from "expo-router";
import AnalyticsDashboard from "../components/admin/AnalyticsDashboard";

export default function AnalyticsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Business Analytics",
          headerShadowVisible: false,
        }}
      />
      <AnalyticsDashboard />
    </SafeAreaView>
  );
}
