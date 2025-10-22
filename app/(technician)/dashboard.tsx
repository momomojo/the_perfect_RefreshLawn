import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Settings, MapPin } from 'lucide-react-native';

import TodayJobs from '../components/technician/TodayJobs';
import WeeklySchedule from '../components/technician/WeeklySchedule';
import { useAuth } from '../../lib/auth';
import { getProfile } from '../../lib/data';

export default function TechnicianDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  console.log('[TechnicianDashboard] authLoading:', authLoading, 'user:', user);
  const [profile, setProfile] = useState<{ first_name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    // If no user is signed in, stop loading and show anon state
    if (!user?.id) {
      console.log(
        '[TechnicianDashboard] No user signed in, skipping profile load'
      );
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        const userProfile = await getProfile(user.id);
        setProfile(userProfile);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [authLoading, user?.id]);

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
      <View className="bg-green-600 px-4 pb-4 pt-12">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-white">Dashboard</Text>
            <View className="mt-1 flex-row items-center">
              <MapPin size={14} color="#ffffff" />
              <Text className="ml-1 text-sm text-white">
                Current Location: Service Area
              </Text>
            </View>
          </View>
          <TouchableOpacity
            className="p-2"
            onPress={() => router.push('/(technician)/profile')}
          >
            <Settings size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Welcome Message */}
        <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          {loading ? (
            <ActivityIndicator size="small" color="#22c55e" />
          ) : (
            <>
              <Text className="text-lg font-medium text-gray-800">
                Welcome back, {profile?.first_name || 'Technician'}!
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
        <View className="mb-8 mt-4 rounded-lg bg-white p-4 shadow-sm">
          <Text className="mb-3 text-lg font-semibold">Quick Actions</Text>
          <View className="flex-row justify-between">
            <TouchableOpacity
              className="mr-2 flex-1 items-center rounded-lg bg-blue-50 p-3"
              onPress={() => router.push('/(technician)/jobs')}
            >
              <Text className="mt-1 font-medium text-blue-700">
                View All Jobs
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="ml-2 flex-1 items-center rounded-lg bg-green-50 p-3">
              <Text className="mt-1 font-medium text-green-700">
                Report Issue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
