import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import RegistrationForm from "../components/auth/RegistrationForm";

export default function RegisterScreen() {
  const router = useRouter();

  const handleRegistrationComplete = () => {
    // In a real app, this would handle the registration process
    // and redirect to verification or login
    router.push("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="p-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-4 flex-row items-center"
          >
            <ArrowLeft size={24} color="#10b981" />
            <Text className="ml-2 text-green-600 font-semibold">
              Back to Login
            </Text>
          </TouchableOpacity>

          <View className="items-center mb-6">
            {/* App logo placeholder */}
            <View className="w-32 h-32 bg-green-100 rounded-full items-center justify-center">
              <Image
                source={{
                  uri: "https://api.dicebear.com/7.x/avataaars/svg?seed=lawncare",
                }}
                style={{ width: 80, height: 80 }}
              />
            </View>
            <Text className="text-2xl font-bold mt-4 text-center">
              Create Your Account
            </Text>
            <Text className="text-gray-600 text-center mt-2">
              Join our lawn care platform to manage your lawn care needs
            </Text>
          </View>

          <RegistrationForm onComplete={handleRegistrationComplete} />

          <View className="mt-6 mb-8">
            <Text className="text-center text-gray-600">
              Already have an account?{" "}
              <Text
                className="text-green-600 font-semibold"
                onPress={() => router.push("/")}
              >
                Sign In
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
