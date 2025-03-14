import React from "react";
import { View, Text, SafeAreaView } from "react-native";
import JobsList from "../components/technician/JobsList";
import { StatusBar } from "expo-status-bar";

export default function JobsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <View className="px-4 py-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-800">My Jobs</Text>
        <Text className="text-gray-600 mt-1">
          View and manage all your assigned lawn care jobs
        </Text>
      </View>
      <JobsList />
    </SafeAreaView>
  );
}
