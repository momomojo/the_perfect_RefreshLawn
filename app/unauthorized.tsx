import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle } from "lucide-react-native";
import { useUserRole } from "../hooks/useUserRole";

/**
 * Displayed when a user tries to access a page they don't have permissions for
 */
export default function UnauthorizedScreen() {
  const router = useRouter();
  const { role } = useUserRole();

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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center p-6">
        <View className="bg-red-100 p-4 rounded-full mb-6">
          <AlertTriangle size={56} color="#DC2626" />
        </View>

        <Text className="text-2xl font-bold text-red-600 mb-4">
          Access Denied
        </Text>

        <Text className="text-center text-gray-700 mb-8 text-lg">
          You don't have permission to access the requested page.
        </Text>

        <Text className="text-center text-gray-600 mb-8">
          Your current role:{" "}
          <Text className="font-bold">{role || "Not logged in"}</Text>
        </Text>

        <View className="w-full gap-y-4">
          <TouchableOpacity
            className="bg-green-600 py-3 rounded-lg items-center"
            onPress={goToAppropriateHome}
          >
            <Text className="text-white font-semibold">Go to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="border border-gray-300 py-3 rounded-lg items-center"
            onPress={() => router.back()}
          >
            <Text className="text-gray-700">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
