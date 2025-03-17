import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useUserRole } from "../../../hooks/useUserRole";

/**
 * Example component that demonstrates displaying different content based on user's role
 */
const RoleBasedProfileContent = () => {
  const { role, isAdmin, isTechnician, isCustomer, loading, refreshRole } =
    useUserRole();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-2 text-gray-600">Loading user role...</Text>
      </View>
    );
  }

  return (
    <View className="p-4">
      <View className="bg-gray-100 p-4 rounded-lg mb-4">
        <Text className="text-gray-800 mb-2">
          Current Role: <Text className="font-bold">{role || "Not set"}</Text>
        </Text>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg mt-2 items-center"
          onPress={refreshRole}
        >
          <Text className="text-white font-semibold">Refresh Role</Text>
        </TouchableOpacity>
      </View>

      {/* Admin-only content */}
      {isAdmin && (
        <View className="bg-purple-100 p-4 rounded-lg mb-4 border border-purple-300">
          <Text className="text-purple-800 font-bold mb-2">
            Admin Dashboard
          </Text>
          <Text className="text-purple-700">
            As an admin, you have access to:
          </Text>
          <View className="ml-4 mt-2">
            <Text className="text-purple-700">• User management</Text>
            <Text className="text-purple-700">• System settings</Text>
            <Text className="text-purple-700">• Service configuration</Text>
            <Text className="text-purple-700">• Analytics and reporting</Text>
          </View>
        </View>
      )}

      {/* Technician-only content */}
      {isTechnician && (
        <View className="bg-blue-100 p-4 rounded-lg mb-4 border border-blue-300">
          <Text className="text-blue-800 font-bold mb-2">
            Technician Portal
          </Text>
          <Text className="text-blue-700">
            As a technician, you have access to:
          </Text>
          <View className="ml-4 mt-2">
            <Text className="text-blue-700">• Your assigned jobs</Text>
            <Text className="text-blue-700">• Schedule management</Text>
            <Text className="text-blue-700">• Customer information</Text>
            <Text className="text-blue-700">• Job reporting tools</Text>
          </View>
        </View>
      )}

      {/* Customer-only content */}
      {isCustomer && (
        <View className="bg-green-100 p-4 rounded-lg mb-4 border border-green-300">
          <Text className="text-green-800 font-bold mb-2">
            Customer Dashboard
          </Text>
          <Text className="text-green-700">
            As a customer, you have access to:
          </Text>
          <View className="ml-4 mt-2">
            <Text className="text-green-700">• Book new services</Text>
            <Text className="text-green-700">• View upcoming appointments</Text>
            <Text className="text-green-700">• Manage payment methods</Text>
            <Text className="text-green-700">• Submit reviews</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default RoleBasedProfileContent;
