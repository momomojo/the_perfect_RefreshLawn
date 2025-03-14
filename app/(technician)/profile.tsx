import React from "react";
import { View, Text, SafeAreaView } from "react-native";
import TechnicianProfile from "../components/technician/TechnicianProfile";
import { Stack } from "expo-router";

export default function ProfileScreen() {
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
          name="Alex Johnson"
          email="alex.johnson@lawncare.com"
          phone="(555) 987-6543"
          skills={[
            "Lawn Mowing",
            "Hedge Trimming",
            "Fertilization",
            "Leaf Removal",
          ]}
          availability={[
            {
              day: "Monday",
              available: true,
              startTime: "08:00",
              endTime: "17:00",
            },
            {
              day: "Tuesday",
              available: true,
              startTime: "08:00",
              endTime: "17:00",
            },
            {
              day: "Wednesday",
              available: true,
              startTime: "08:00",
              endTime: "17:00",
            },
            {
              day: "Thursday",
              available: true,
              startTime: "08:00",
              endTime: "17:00",
            },
            {
              day: "Friday",
              available: true,
              startTime: "08:00",
              endTime: "17:00",
            },
            {
              day: "Saturday",
              available: false,
              startTime: "09:00",
              endTime: "15:00",
            },
            {
              day: "Sunday",
              available: false,
              startTime: "09:00",
              endTime: "15:00",
            },
          ]}
          notificationPreferences={{
            newJobs: true,
            scheduleChanges: true,
            urgentRequests: true,
            appUpdates: false,
          }}
        />
      </View>
    </SafeAreaView>
  );
}
