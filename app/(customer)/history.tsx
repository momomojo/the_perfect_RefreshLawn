import React from "react";
import { View, Text, SafeAreaView } from "react-native";
import { Stack } from "expo-router";
import ServiceHistory from "../components/customer/ServiceHistory";

export default function HistoryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Service History",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "white" },
        }}
      />

      <View className="flex-1">
        <ServiceHistory />
      </View>
    </SafeAreaView>
  );
}
