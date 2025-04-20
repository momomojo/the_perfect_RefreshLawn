import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Stack, router } from "expo-router";
import { CreditCard, Users, FileText } from "lucide-react-native";

export default function BillingScreen() {
  const menuItems = [
    {
      name: "Payments",
      icon: <CreditCard size={24} color="#4b5563" />,
      route: "/(admin_stack)/payments",
      description: "View all payment transactions",
    },
    {
      name: "Customers",
      icon: <Users size={24} color="#4b5563" />,
      route: "/(admin_stack)/customers",
      description: "View and manage Stripe customers",
    },
    {
      name: "Invoices",
      icon: <FileText size={24} color="#4b5563" />,
      route: "/(admin_stack)/invoices",
      description: "View Stripe invoices",
    },
    // Add other billing related items here (e.g., Subscriptions)
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen options={{ title: "Billing Center", headerShown: true }} />
      <ScrollView className="p-4">
        <Text className="text-lg font-semibold text-gray-700 mb-4">
          Stripe Billing Management
        </Text>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            className="bg-white p-4 rounded-lg shadow-sm mb-3 flex-row items-center border border-gray-200"
            onPress={() => router.push(item.route)}
          >
            <View className="mr-4 p-2 bg-gray-100 rounded-full">
              {item.icon}
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-800">
                {item.name}
              </Text>
              <Text className="text-sm text-gray-500">{item.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
