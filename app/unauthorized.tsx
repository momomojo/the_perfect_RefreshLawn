import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle } from "lucide-react-native";
import { useUserRole } from "../hooks/useUserRole";
import { supabase } from "../utils/supabase";

/**
 * Displayed when a user tries to access a page they don't have permissions for
 */
export default function UnauthorizedScreen() {
  const router = useRouter();
  const { role, refreshRole, forceReauthentication } = useUserRole();
  const [isLoading, setIsLoading] = useState(false);

  const goToAppropriateHome = () => {
    if (role === "admin") {
      router.replace("/(admin)");
    } else if (role === "technician") {
      router.replace("/(technician)");
    } else {
      // Default to customer home
      router.replace("/(customer)");
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const tryRefreshToken = async () => {
    try {
      setIsLoading(true);
      // Force refresh auth session to get newest JWT
      await refreshRole();
      Alert.alert("Success", "Session refreshed successfully. Redirecting...");
      goToAppropriateHome();
    } catch (error) {
      console.error("Error refreshing session:", error);
      Alert.alert(
        "Error",
        "Failed to refresh session. Please try signing out and in again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceReauthentication = async () => {
    try {
      setIsLoading(true);
      const shouldRedirect = await forceReauthentication();
      if (shouldRedirect) {
        Alert.alert(
          "Signed Out Successfully",
          "Please sign in again to update your authorization tokens.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/login"),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error forcing reauthentication:", error);
      Alert.alert(
        "Error",
        "Failed to sign out. Please try manually logging out."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center p-6">
        <View className="bg-red-100 p-4 rounded-full mb-6">
          <AlertTriangle size={56} color="#DC2626" />
        </View>

        <Text className="text-2xl font-bold text-red-600 mb-4">
          Access Denied
        </Text>

        <Text className="text-center text-gray-700 mb-4 text-lg">
          You don't have permission to access the requested page.
        </Text>

        <Text className="text-center text-gray-700 mb-2 text-base">
          This can happen if:
        </Text>
        <View className="w-full mb-6">
          <Text className="text-gray-600 mb-1">
            • Your JWT token doesn't have the right claims
          </Text>
          <Text className="text-gray-600 mb-1">
            • Your account was created before role claims were added
          </Text>
          <Text className="text-gray-600 mb-1">
            • You're trying to access a restricted area
          </Text>
        </View>

        <Text className="text-center text-gray-600 mb-8">
          Your current role:{" "}
          <Text className="font-bold">{role || "Not logged in"}</Text>
        </Text>

        <View className="w-full gap-y-4">
          {isLoading ? (
            <View className="p-4 items-center">
              <ActivityIndicator size="large" color="#22C55E" />
              <Text className="mt-2 text-gray-600">Please wait...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                className="bg-green-600 py-3 rounded-lg items-center"
                onPress={goToAppropriateHome}
              >
                <Text className="text-white font-semibold">Go to Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-blue-600 py-3 rounded-lg items-center"
                onPress={tryRefreshToken}
              >
                <Text className="text-white font-semibold">
                  Refresh Session
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-purple-600 py-3 rounded-lg items-center"
                onPress={handleForceReauthentication}
              >
                <Text className="text-white font-semibold">
                  Fix Claims (Sign Out & In)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-red-600 py-3 rounded-lg items-center"
                onPress={handleLogout}
              >
                <Text className="text-white font-semibold">Log Out</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="border border-gray-300 py-3 rounded-lg items-center"
                onPress={() => router.back()}
              >
                <Text className="text-gray-700">Go Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
