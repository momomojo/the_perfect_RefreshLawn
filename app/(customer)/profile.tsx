import React from "react";
import { View, Text, SafeAreaView } from "react-native";
import { Stack } from "expo-router";
import ProfileSettings from "../components/common/ProfileSettings";

export default function CustomerProfileScreen() {
  // Mock customer data - in a real app, this would come from your auth/state management system
  const customerData = {
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    phone: "(555) 987-6543",
    address: "456 Oak Avenue, Springfield, IL 62701",
    notificationPreferences: {
      email: true,
      push: true,
      sms: true,
    },
    paymentMethods: [
      {
        id: "1",
        type: "Visa",
        last4: "4321",
        expiryDate: "09/25",
        isDefault: true,
      },
      {
        id: "2",
        type: "Mastercard",
        last4: "8765",
        expiryDate: "11/26",
        isDefault: false,
      },
      {
        id: "3",
        type: "American Express",
        last4: "3456",
        expiryDate: "07/24",
        isDefault: false,
      },
    ],
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "My Profile",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "white" },
        }}
      />

      <View className="flex-1">
        <ProfileSettings userType="customer" userData={customerData} />
      </View>
    </SafeAreaView>
  );
}
