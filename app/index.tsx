import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Leaf } from "lucide-react-native";
import LoginForm from "./components/auth/LoginForm";

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      // Simulate authentication delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Determine user role based on email prefix for demo purposes
      if (email.startsWith("admin")) {
        router.replace("/(admin)/dashboard");
      } else if (email.startsWith("tech")) {
        router.replace("/(technician)/dashboard");
      } else {
        router.replace("/(customer)/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1589923188900-85dae523342b?w=800&q=80",
        }}
        className="flex-1"
      >
        <View className="flex-1 bg-black/40">
          <View className="flex-1 justify-center items-center px-6">
            <View className="w-full max-w-md bg-white/90 rounded-xl p-6 shadow-lg">
              <View className="items-center mb-6">
                <View className="items-center justify-center">
                  <View className="w-32 h-32 rounded-full bg-green-900 items-center justify-center">
                    <Image
                      source={require("../assets/images/icon.png")}
                      className="w-32 h-32 rounded-full"
                      resizeMode="contain"
                    />
                  </View>
                  <Text className="mt-2 text-xl font-bold text-green-900">
                    GreenScape
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Lawn Care Services
                  </Text>
                </View>
              </View>

              <LoginForm onLogin={handleLogin} isLoading={isLoading} />

              <View className="mt-8 items-center">
                <Text className="text-gray-600 text-sm">
                  Choose role for demo:
                </Text>
                <View className="flex-row mt-2 space-x-3">
                  <RoleButton
                    label="Customer"
                    onPress={() =>
                      handleLogin("customer@example.com", "password")
                    }
                  />
                  <RoleButton
                    label="Technician"
                    onPress={() => handleLogin("tech@example.com", "password")}
                  />
                  <RoleButton
                    label="Admin"
                    onPress={() => handleLogin("admin@example.com", "password")}
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="pb-6 items-center">
            <Text className="text-white text-sm">
              © 2023 GreenScape Lawn Care
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

interface RoleButtonProps {
  label: string;
  onPress: () => void;
}

const RoleButton = ({ label, onPress }: RoleButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    className="bg-green-600 px-3 py-2 rounded-md flex-row items-center"
  >
    <Leaf size={16} color="white" />
    <Text className="text-white ml-1 font-medium">{label}</Text>
  </TouchableOpacity>
);
