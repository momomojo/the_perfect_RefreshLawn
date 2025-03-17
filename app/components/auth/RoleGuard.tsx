import React, { ReactNode, useEffect } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useUserRole } from "../../../hooks/useUserRole";

interface RoleGuardProps {
  allowedRoles: string[];
  redirectPath?: string;
  children: ReactNode;
}

/**
 * A component that restricts access to certain routes based on user roles
 * @param allowedRoles - Array of roles that are allowed to access the content
 * @param redirectPath - Where to redirect if access is denied (defaults to root)
 * @param children - The content to render if access is granted
 */
const RoleGuard = ({
  allowedRoles,
  redirectPath = "/",
  children,
}: RoleGuardProps) => {
  const { role, loading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    // Check if the user has one of the allowed roles once role is loaded
    if (!loading && role && !allowedRoles.includes(role)) {
      // If not, redirect to the specified path
      router.replace(redirectPath);
    }
  }, [role, loading, allowedRoles, redirectPath, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-2 text-gray-600">Verifying access...</Text>
      </View>
    );
  }

  // Handle unauthorized access while still on the page
  if (!role || !allowedRoles.includes(role)) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-lg text-red-600 mb-4">Access Denied</Text>
        <Text className="text-gray-700 mb-6 text-center">
          You don't have permission to access this page.
        </Text>
        <TouchableOpacity
          className="bg-green-600 px-6 py-3 rounded-lg"
          onPress={() => router.replace(redirectPath)}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render the protected content
  return <>{children}</>;
};

export default RoleGuard;
