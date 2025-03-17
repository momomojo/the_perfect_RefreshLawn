import React from "react";
import {
  View,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import PasswordResetForm from "../components/auth/PasswordResetForm";
import { Leaf } from "lucide-react-native";

const ForgotPasswordScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 items-center justify-center p-6">
            {/* App Logo */}
            <View className="items-center mb-8">
              <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-2">
                <Leaf size={48} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-green-800">
                Lawn Refresh
              </Text>
              <Text className="text-sm text-gray-600">
                Professional Lawn Care Services
              </Text>
            </View>

            {/* Password Reset Form */}
            <PasswordResetForm />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
