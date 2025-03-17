import React from "react";
import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { Home, Briefcase, User } from "lucide-react-native";
import ProtectedRoute from "../components/common/ProtectedRoute";

export default function TechnicianLayout() {
  return (
    <ProtectedRoute requiredRole="technician">
      <View className="flex-1 bg-white">
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: "#22c55e",
            tabBarInactiveTintColor: "#6b7280",
            tabBarStyle: {
              backgroundColor: "white",
              borderTopWidth: 1,
              borderTopColor: "#e5e7eb",
              paddingTop: 5,
              height: 60,
            },
            headerStyle: {
              backgroundColor: "white",
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: "#e5e7eb",
            },
            headerTitleStyle: {
              fontWeight: "bold",
              color: "#111827",
            },
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              title: "Dashboard",
              tabBarIcon: ({ color }) => <Home size={24} color={color} />,
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Dashboard
                </Text>
              ),
              headerTitle: "Technician Dashboard",
            }}
          />
          <Tabs.Screen
            name="jobs"
            options={{
              title: "Jobs",
              tabBarIcon: ({ color }) => <Briefcase size={24} color={color} />,
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Jobs
                </Text>
              ),
              headerTitle: "My Jobs",
            }}
          />
          <Tabs.Screen
            name="job-details"
            options={{
              headerTitle: "Job Details",
              href: null,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color }) => <User size={24} color={color} />,
              tabBarLabel: ({ color }) => (
                <Text style={{ color, fontSize: 12, marginBottom: 5 }}>
                  Profile
                </Text>
              ),
              headerTitle: "My Profile",
            }}
          />
        </Tabs>
      </View>
    </ProtectedRoute>
  );
}
