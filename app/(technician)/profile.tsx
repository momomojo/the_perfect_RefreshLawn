import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, ActivityIndicator } from "react-native";
import TechnicianProfile from "../components/technician/TechnicianProfile";
import { Stack } from "expo-router";
import { useAuth } from "../../lib/auth";
import { getProfile } from "../../lib/data";

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const userProfile = await getProfile(user.id);
        setProfile(userProfile);
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  // These are mock/default data since they're not part of the Profile type in data.ts
  const defaultAvailability = [
    { day: "Monday", available: true, startTime: "08:00", endTime: "17:00" },
    { day: "Tuesday", available: true, startTime: "08:00", endTime: "17:00" },
    { day: "Wednesday", available: true, startTime: "08:00", endTime: "17:00" },
    { day: "Thursday", available: true, startTime: "08:00", endTime: "17:00" },
    { day: "Friday", available: true, startTime: "08:00", endTime: "17:00" },
    { day: "Saturday", available: false, startTime: "09:00", endTime: "15:00" },
    { day: "Sunday", available: false, startTime: "09:00", endTime: "15:00" },
  ];

  const defaultNotificationPreferences = {
    newJobs: true,
    scheduleChanges: true,
    urgentRequests: true,
    appUpdates: false,
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#22c55e" />
        <Text className="text-gray-500 mt-2">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text className="text-red-500">Error loading profile data</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "My Profile",
          headerShown: true,
        }}
      />
      <View className="flex-1">
        <View className="px-4 py-3 border-b border-gray-200">
          <Text className="text-2xl font-bold">My Profile</Text>
        </View>

        <TechnicianProfile
          name={`${profile.first_name} ${profile.last_name}`}
          email={user?.email || ""}
          phone={profile.phone || ""}
          skills={[
            "Lawn Mowing",
            "Hedge Trimming",
            "Fertilization",
            "Leaf Removal",
          ]} // Example skills since they're not in the Profile type
          availability={defaultAvailability}
          notificationPreferences={defaultNotificationPreferences}
        />
      </View>
    </SafeAreaView>
  );
}
