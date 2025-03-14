import React from "react";
import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { Home, Calendar, ClipboardList, User } from "lucide-react-native";

export default function CustomerLayout() {
  return (
    <View className="flex-1 bg-white">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#10b981",
          tabBarInactiveTintColor: "#6b7280",
          tabBarStyle: {
            backgroundColor: "white",
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            paddingTop: 5,
            height: 60,
          },
          headerShown: true,
          headerStyle: {
            backgroundColor: "white",
          },
          headerTitleStyle: {
            color: "#111827",
            fontWeight: "bold",
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
            tabBarLabel: ({ color }) => (
              <Text style={{ color, fontSize: 12 }}>Home</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            title: "Services",
            tabBarIcon: ({ color }) => (
              <ClipboardList size={24} color={color} />
            ),
            tabBarLabel: ({ color }) => (
              <Text style={{ color, fontSize: 12 }}>Services</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="booking"
          options={{
            title: "Book Service",
            tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
            tabBarLabel: ({ color }) => (
              <Text style={{ color, fontSize: 12 }}>Book</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "Service History",
            tabBarIcon: ({ color }) => (
              <ClipboardList size={24} color={color} />
            ),
            tabBarLabel: ({ color }) => (
              <Text style={{ color, fontSize: 12 }}>History</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "My Profile",
            tabBarIcon: ({ color }) => <User size={24} color={color} />,
            tabBarLabel: ({ color }) => (
              <Text style={{ color, fontSize: 12 }}>Profile</Text>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
