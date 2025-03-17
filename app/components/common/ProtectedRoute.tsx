import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../../../lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "customer" | "technician" | "admin" | null;
  fallbackPath?: string;
}

/**
 * ProtectedRoute component that guards routes based on authentication status and user role
 *
 * @param children - The child components to render when access is granted
 * @param requiredRole - The role required to access this route (customer, technician, or admin)
 * @param fallbackPath - Where to redirect if access is denied (defaults to "/")
 */
const ProtectedRoute = ({
  children,
  requiredRole,
  fallbackPath = "/",
}: ProtectedRouteProps) => {
  const { user, loading, isAdmin, isTechnician, isCustomer } = useAuth();

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  // No user, redirect to login
  if (!user) {
    return <Redirect href={fallbackPath} />;
  }

  // If a specific role is required, check permissions
  if (requiredRole) {
    let hasRequiredRole = false;

    switch (requiredRole) {
      case "admin":
        hasRequiredRole = isAdmin;
        break;
      case "technician":
        hasRequiredRole = isTechnician;
        break;
      case "customer":
        hasRequiredRole = isCustomer;
        break;
    }

    // If user doesn't have the required role, redirect to appropriate dashboard
    if (!hasRequiredRole) {
      let redirectPath = "/";

      // Redirect based on user's actual role
      if (isAdmin) {
        redirectPath = "/(admin)/dashboard";
      } else if (isTechnician) {
        redirectPath = "/(technician)/dashboard";
      } else if (isCustomer) {
        redirectPath = "/(customer)/dashboard";
      }

      return <Redirect href={redirectPath} />;
    }
  }

  // User is authenticated and has the required role
  return <>{children}</>;
};

export default ProtectedRoute;
