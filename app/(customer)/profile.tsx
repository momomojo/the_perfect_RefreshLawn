import React, { useEffect, useState } from "react";
import { View, Text, SafeAreaView, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import ProfileSettings from "../components/common/ProfileSettings";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../utils/supabase";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

export default function CustomerProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);

        if (!user) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }

        // Fetch profile data from Supabase
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error.message);
          setError(error.message);
          return;
        }

        setProfile(data);
      } catch (err) {
        console.error("Profile loading error:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  // Transform profile data to format expected by ProfileSettings
  const customerData = profile
    ? {
        name:
          `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
          "User",
        email: user?.email || "Not set",
        phone: profile.phone || "Not set",
        address:
          [profile.address, profile.city, profile.state, profile.zip_code]
            .filter(Boolean)
            .join(", ") || "Not set",
        notificationPreferences: {
          email: true,
          push: true,
          sms: false,
        },
        // In a real app, you'd fetch payment methods from a secure source
        paymentMethods: [],
      }
    : null;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center p-4">
        <Text className="text-red-500">Error: {error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "My Profile",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "white" },
        }}
      />

      <View className="flex-1">
        {customerData ? (
          <ProfileSettings userType="customer" userData={customerData} />
        ) : (
          <View className="flex-1 justify-center items-center p-4">
            <Text>Profile data not available</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
