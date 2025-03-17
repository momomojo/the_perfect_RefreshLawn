import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react-native";
import { useAuth } from "../../../lib/auth";

const NewPasswordForm = () => {
  const router = useRouter();
  const { updatePassword, loading, error } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password validation states
  const [validations, setValidations] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false,
  });

  const validatePassword = (value: string) => {
    setValidations({
      hasMinLength: value.length >= 8,
      hasUppercase: /[A-Z]/.test(value),
      hasLowercase: /[a-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      passwordsMatch: value === confirmPassword,
    });
  };

  const validateConfirmPassword = (value: string) => {
    setValidations((prev) => ({
      ...prev,
      passwordsMatch: password === value,
    }));
  };

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    const isPasswordValid = Object.values(validations).every(
      (value) => value === true
    );
    if (!isPasswordValid) {
      Alert.alert("Error", "Password does not meet all requirements");
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePassword(password);
      // Navigation is handled in the auth context
    } catch (err) {
      console.error("Error updating password:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProcessing = isSubmitting || loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 w-full"
    >
      <ScrollView className="flex-1 px-6">
        <View className="w-full bg-white rounded-lg p-6 shadow-sm">
          <Text className="text-2xl font-bold text-center mb-2 text-gray-800">
            Set New Password
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            Create a new secure password for your account
          </Text>

          <View className="mb-6">
            <Text className="text-gray-700 mb-2 font-medium">New Password</Text>
            <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
              <Lock size={20} color="#6b7280" />
              <TextInput
                className="flex-1 ml-2 text-base text-gray-800"
                placeholder="Enter new password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  validatePassword(text);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isProcessing}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={isProcessing}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#6b7280" />
                ) : (
                  <Eye size={20} color="#6b7280" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 mb-2 font-medium">
              Confirm Password
            </Text>
            <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
              <Lock size={20} color="#6b7280" />
              <TextInput
                className="flex-1 ml-2 text-base text-gray-800"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  validateConfirmPassword(text);
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isProcessing}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isProcessing}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#6b7280" />
                ) : (
                  <Eye size={20} color="#6b7280" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-6 bg-gray-50 p-4 rounded-lg">
            <Text className="text-gray-700 font-medium mb-2">
              Password Requirements:
            </Text>
            <View className="space-y-2">
              <PasswordRequirement
                met={validations.hasMinLength}
                text="At least 8 characters"
              />
              <PasswordRequirement
                met={validations.hasUppercase}
                text="At least one uppercase letter"
              />
              <PasswordRequirement
                met={validations.hasLowercase}
                text="At least one lowercase letter"
              />
              <PasswordRequirement
                met={validations.hasNumber}
                text="At least one number"
              />
              <PasswordRequirement
                met={validations.hasSpecialChar}
                text="At least one special character"
              />
              <PasswordRequirement
                met={validations.passwordsMatch}
                text="Passwords match"
              />
            </View>
          </View>

          {error && (
            <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text className="text-red-600">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            className={`w-full py-3 rounded-lg ${
              isProcessing || !Object.values(validations).every(Boolean)
                ? "bg-blue-300"
                : "bg-blue-500"
            }`}
            onPress={handleSubmit}
            disabled={
              isProcessing || !Object.values(validations).every(Boolean)
            }
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-center text-base">
                Reset Password
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-4"
            onPress={() => router.replace("/")}
            disabled={isProcessing}
          >
            <Text className="text-blue-500 text-center">Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

interface PasswordRequirementProps {
  met: boolean;
  text: string;
}

const PasswordRequirement = ({ met, text }: PasswordRequirementProps) => (
  <View className="flex-row items-center">
    <CheckCircle
      size={16}
      color={met ? "#10b981" : "#9ca3af"}
      fill={met ? "#10b981" : "transparent"}
    />
    <Text className={`ml-2 ${met ? "text-green-600" : "text-gray-500"}`}>
      {text}
    </Text>
  </View>
);

export default NewPasswordForm;
