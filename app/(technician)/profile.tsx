import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator } from 'react-native';
import TechnicianProfile from '../components/technician/TechnicianProfile';
import { Stack } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { getProfile } from '../../lib/data';

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
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  // Mock notification preferences for demonstration
  const defaultNotificationPreferences = {
    newJobs: true,
    scheduleChanges: true,
    urgentRequests: true,
    appUpdates: false,
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#22c55e" />
        <Text className="mt-2 text-gray-500">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="text-red-500">Error loading profile data</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: 'My Profile',
          headerShown: true,
        }}
      />
      <View className="flex-1">
        <View className="border-b border-gray-200 px-4 py-3">
          <Text className="text-2xl font-bold">My Profile</Text>
        </View>

        <TechnicianProfile
          name={`${profile.first_name} ${profile.last_name}`}
          email={user?.email || ''}
          phone={profile.phone || ''}
          skills={[
            'Lawn Mowing',
            'Hedge Trimming',
            'Fertilization',
            'Leaf Removal',
          ]} // Example skills since they're not in the Profile type
          autoSendJobReports={profile.auto_send_job_reports ?? true}
          notificationPreferences={defaultNotificationPreferences}
        />
      </View>
    </SafeAreaView>
  );
}
