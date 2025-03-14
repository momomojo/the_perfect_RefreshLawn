import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";

interface PasswordResetFormProps {
  onSubmit?: (email: string) => Promise<void>;
  isLoading?: boolean;
}

const PasswordResetForm = ({
  onSubmit = async (email) => {
    // Mock implementation for the UI scaffolding
    console.log(`Password reset requested for: ${email}`);
    return new Promise((resolve) => setTimeout(resolve, 1500));
  },
  isLoading = false,
}: PasswordResetFormProps) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loading = isLoading || localLoading;

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    try {
      setLocalLoading(true);
      await onSubmit(email);
      setSubmitted(true);
    } catch (error) {
      Alert.alert("Error", "Failed to send reset link. Please try again.");
    } finally {
      setLocalLoading(false);
    }
  };

  if (submitted) {
    return (
      <View className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
        <View className="items-center mb-6">
          <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
            <Mail size={32} color="#10b981" />
          </View>
          <Text className="text-xl font-bold text-center text-gray-800">
            Check Your Email
          </Text>
          <Text className="mt-2 text-center text-gray-600">
            We've sent a password reset link to {email}. Please check your
            inbox.
          </Text>
        </View>
        <TouchableOpacity
          className="w-full py-3 bg-blue-600 rounded-md"
          onPress={() => router.push("/")}
        >
          <Text className="text-center text-white font-semibold">
            Return to Login
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
      <Text className="text-2xl font-bold text-center text-gray-800 mb-2">
        Forgot Password
      </Text>
      <Text className="text-center text-gray-600 mb-6">
        Enter your email address and we'll send you a link to reset your
        password.
      </Text>

      <View className="mb-6">
        <Text className="text-sm font-medium text-gray-700 mb-1">
          Email Address
        </Text>
        <TextInput
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:border-blue-500 focus:outline-none"
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        className={`w-full py-3 rounded-md ${loading ? "bg-blue-400" : "bg-blue-600"}`}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-center text-white font-semibold">
            Send Reset Link
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity className="mt-4" onPress={() => router.push("/")}>
        <Text className="text-center text-blue-600">Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PasswordResetForm;
