import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Link } from "expo-router";
import { Eye, EyeOff, Mail, Lock } from "lucide-react-native";

interface LoginFormProps {
  onLogin?: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
}

const LoginForm = ({
  onLogin = async () => {},
  isLoading = false,
}: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    try {
      await onLogin(email, password);
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    }
  };

  return (
    <View className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
      <Text className="text-2xl font-bold text-center text-green-800 mb-6">
        Login
      </Text>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
        <View className="flex-row items-center border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
          <Mail size={20} color="#4B5563" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-900"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
        <View className="flex-row items-center border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
          <Lock size={20} color="#4B5563" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-900"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <EyeOff size={20} color="#4B5563" />
            ) : (
              <Eye size={20} color="#4B5563" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        className={`w-full py-3 rounded-md ${isLoading ? "bg-green-400" : "bg-green-600"}`}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-center text-white font-semibold">Sign In</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-between mt-4">
        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity>
            <Text className="text-sm text-green-700">Forgot Password?</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text className="text-sm text-green-700">Create Account</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

export default LoginForm;
