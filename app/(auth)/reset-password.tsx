import React from "react";
import { View, Text, SafeAreaView, ScrollView, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import NewPasswordForm from "../components/auth/NewPasswordForm";

const ResetPasswordScreen = () => {
  // Get token and email from URL params
  const { token, email } = useLocalSearchParams<{
    token: string;
    email: string;
  }>();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-full max-w-md">
            <View className="items-center mb-8">
              {/* Using Image directly instead of Logo component */}
              <Image
                source={require("../../assets/images/icon.png")}
                style={{ width: 100, height: 100 }}
                className="rounded-full"
              />
              <Text className="text-2xl font-bold text-center mt-4 text-gray-800">
                Reset Your Password
              </Text>
              <Text className="text-gray-600 text-center mt-2">
                Create a new secure password for your account
              </Text>
            </View>

            <NewPasswordForm token={token} email={email} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;
