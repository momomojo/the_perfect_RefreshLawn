import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import ProfileSettings from "../components/common/ProfileSettings";
import { useAuth } from "../../lib/auth";
import { getProfile, Profile, updateProfile } from "../../lib/data";

interface UserData {
  name: string;
  email: string;
  phone: string;
  address: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  paymentMethods: any[];
}

export default function CustomerProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      // Fetch profile data from Supabase using the data helper
      const profileData = await getProfile(user.id);
      setProfile(profileData);
      setError(null);
    } catch (err: any) {
      console.error("Profile loading error:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<UserData>) => {
    if (!user || !profile) return;

    try {
      setLoading(true);

      // Extract name parts
      const nameParts = updatedData.name?.split(" ") || [];
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Extract address parts (address might be in format "123 Main St, City, State, Zip")
      const addressParts =
        updatedData.address?.split(",").map((part) => part.trim()) || [];
      const address = addressParts[0] || "";
      const city = addressParts[1] || "";
      let state = "";
      let zipCode = "";

      if (addressParts.length > 2) {
        const stateZipParts = addressParts[2]?.split(" ");
        if (stateZipParts?.length >= 2) {
          state = stateZipParts[0] || "";
          zipCode = stateZipParts.slice(1).join(" ") || "";
        }
      }

      // Create profile update object
      const profileUpdates = {
        first_name: firstName,
        last_name: lastName,
        phone: updatedData.phone,
        address,
        city,
        state,
        zip_code: zipCode,
      };

      // Update profile in Supabase
      const updatedProfile = await updateProfile(user.id, profileUpdates);
      setProfile(updatedProfile);

      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      console.error("Profile update error:", err);
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

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
          <ProfileSettings
            userType="customer"
            userData={customerData}
            onUpdateProfile={handleUpdateProfile}
          />
        ) : (
          <View className="flex-1 justify-center items-center p-4">
            <Text>Profile data not available</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
