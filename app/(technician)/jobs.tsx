import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import JobsList from '../components/technician/JobsList';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from '../components/common/ErrorBoundary';

function JobsScreenContent() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <View className="border-b border-gray-200 px-4 py-4">
        <Text className="text-2xl font-bold text-gray-800">My Jobs</Text>
        <Text className="mt-1 text-gray-600">
          View and manage all your assigned lawn care jobs
        </Text>
      </View>
      <JobsList />
    </SafeAreaView>
  );
}

export default function JobsScreen() {
  return (
    <ErrorBoundary fallbackMessage="Jobs List Error">
      <JobsScreenContent />
    </ErrorBoundary>
  );
}
