import React from "react";
import { View, Text, SafeAreaView } from "react-native";
import { Stack } from "expo-router";
import ServiceManagement from "../components/admin/ServiceManagement";

export default function ServicesPage() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Service Management",
          headerStyle: {
            backgroundColor: "#15803d", // green-700
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />

      <View className="flex-1 bg-white">
        <ServiceManagement />
      </View>
    </SafeAreaView>
  );
}
