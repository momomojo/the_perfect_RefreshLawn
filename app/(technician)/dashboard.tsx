import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Bell, Settings, MapPin } from "lucide-react-native";

import TodayJobs from "../components/technician/TodayJobs";
import WeeklySchedule from "../components/technician/WeeklySchedule";
import { useAuth } from "../../lib/auth";
import { getProfile } from "../../lib/data";

export default function TechnicianDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ first_name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const userProfile = await getProfile(user.id);
        setProfile(userProfile);
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  const handleJobSelect = (jobId: string) => {
    router.push(`/(technician)/job-details/${jobId}`);
  };

  const handleDayPress = (date: string) => {
    console.log(`Viewing schedule for: ${date}`);
    // Future enhancement: Navigate to a detailed day view or filter jobs by this date
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-green-600 pt-12 pb-4 px-4">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-2xl font-bold">Dashboard</Text>
            <View className="flex-row items-center mt-1">
              <MapPin size={14} color="#ffffff" />
              <Text className="text-white text-sm ml-1">
                Current Location: Service Area
              </Text>
            </View>
          </View>
          <View className="flex-row space-x-4">
            <TouchableOpacity className="p-2">
              <Bell size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-2"
              onPress={() => router.push("/(technician)/profile")}
            >
              <Settings size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Welcome Message */}
        <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
          {loading ? (
            <ActivityIndicator size="small" color="#22c55e" />
          ) : (
            <>
              <Text className="text-lg font-medium text-gray-800">
                Welcome back, {profile?.first_name || "Technician"}!
              </Text>
              <Text className="text-gray-600">
                Check your schedule below for today's jobs.
              </Text>
            </>
          )}
        </View>

        {/* Weekly Schedule */}
        <WeeklySchedule onDayPress={handleDayPress} />

        {/* Today's Jobs */}
        <TodayJobs onJobSelect={handleJobSelect} />

        {/* Quick Actions */}
        <View className="bg-white p-4 rounded-lg shadow-sm mt-4 mb-8">
          <Text className="text-lg font-semibold mb-3">Quick Actions</Text>
          <View className="flex-row justify-between">
            <TouchableOpacity
              className="bg-blue-50 p-3 rounded-lg items-center flex-1 mr-2"
              onPress={() => router.push("/(technician)/jobs")}
            >
              <Text className="text-blue-700 font-medium mt-1">
                View All Jobs
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-green-50 p-3 rounded-lg items-center flex-1 ml-2">
              <Text className="text-green-700 font-medium mt-1">
                Report Issue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
