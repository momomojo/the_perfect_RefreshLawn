import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ImageBackground, StatusBar, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Leaf, Database } from "lucide-react-native";
import LoginForm from "./components/auth/LoginForm";
import Account from "./components/auth/Account";
import { useAuth } from "../lib/auth";

export default function AppEntry() {
  const { user, session, loading, rolesLoading, isAdmin, isTechnician, isCustomer } = useAuth();

  // Show loading spinner while checking auth state AND determining roles
  if (loading || rolesLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-4 text-gray-600">
          {loading ? "Checking authentication..." : "Loading your dashboard..."}
        </Text>
      </View>
    );
  }

  // If user is logged in, navigation is handled by the AuthProvider context
  if (!user) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        <ImageBackground
          source={{
            uri: "https://images.unsplash.com/photo-1589923188900-85dae523342b?w=800&q=80",
          }}
          className="flex-1"
          resizeMode="cover"
        >
          <View className="flex-1 bg-black/40 justify-center items-center px-4">
            <View className="w-full max-w-md">
              <View className="items-center mb-8">
                <View className="bg-white p-4 rounded-full mb-4">
                  <Leaf size={40} color="#16a34a" />
                </View>
                <Text className="text-4xl font-bold text-white mb-2">
                  Lawn Refresh
                </Text>
                <Text className="text-lg text-white text-center">
                  Professional lawn care at your fingertips
                </Text>
              </View>
              <LoginForm />
              <TouchableOpacity
                className="mt-6 bg-white/20 py-3 px-6 rounded-lg"
                onPress={() => router.push("/supabase-test")}
              >
                <View className="flex-row items-center justify-center">
                  <Database size={20} color="#ffffff" />
                  <Text className="text-white font-semibold ml-2">
                    Test Supabase Connection
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // If logged in but not routed away (no recognized role), show account/profile
  if (session) {
    return <Account session={session} />;
  }
  // Fallback: should not happen, but handle gracefully
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <StatusBar barStyle="dark-content" />
      <ActivityIndicator size="large" color="#16a34a" />
      <Text className="mt-4 text-gray-600">Loading your account...</Text>
    </View>
  );
}
