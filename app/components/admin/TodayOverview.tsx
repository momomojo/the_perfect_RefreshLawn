import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  User,
} from "lucide-react-native";
import { router } from "expo-router";

interface JobSummary {
  id: string;
  time: string;
  address: string;
  service: string;
  technician: string;
  status: "scheduled" | "in-progress" | "completed" | "issue";
}

interface TodayOverviewProps {
  scheduledJobs?: JobSummary[];
  issuesCount?: number;
  completedCount?: number;
  inProgressCount?: number;
  onJobSelect?: (jobId: string) => void;
}

const TodayOverview = ({
  scheduledJobs = [
    {
      id: "1",
      time: "9:00 AM",
      address: "123 Main St, Anytown",
      service: "Lawn Mowing",
      technician: "John Doe",
      status: "scheduled",
    },
    {
      id: "2",
      time: "10:30 AM",
      address: "456 Oak Ave, Anytown",
      service: "Hedge Trimming",
      technician: "Jane Smith",
      status: "in-progress",
    },
    {
      id: "3",
      time: "1:00 PM",
      address: "789 Pine Rd, Anytown",
      service: "Fertilization",
      technician: "Mike Johnson",
      status: "completed",
    },
    {
      id: "4",
      time: "3:30 PM",
      address: "101 Elm Blvd, Anytown",
      service: "Weed Control",
      technician: "Sarah Williams",
      status: "issue",
    },
  ],
  issuesCount = 1,
  completedCount = 1,
  inProgressCount = 1,
  onJobSelect = (jobId) => router.push(`/booking/${jobId}`),
}: TodayOverviewProps) => {
  return (
    <View className="bg-white rounded-lg p-4 shadow-md w-full">
      <Text className="text-xl font-bold mb-2">Today's Overview</Text>

      {/* Summary Stats */}
      <View className="flex-row justify-between mb-4">
        <View className="items-center p-2 bg-green-50 rounded-md">
          <CheckCircle size={20} color="#22c55e" />
          <Text className="text-sm font-medium mt-1">Completed</Text>
          <Text className="text-lg font-bold">{completedCount}</Text>
        </View>

        <View className="items-center p-2 bg-blue-50 rounded-md">
          <Clock size={20} color="#3b82f6" />
          <Text className="text-sm font-medium mt-1">In Progress</Text>
          <Text className="text-lg font-bold">{inProgressCount}</Text>
        </View>

        <View className="items-center p-2 bg-red-50 rounded-md">
          <AlertTriangle size={20} color="#ef4444" />
          <Text className="text-sm font-medium mt-1">Issues</Text>
          <Text className="text-lg font-bold">{issuesCount}</Text>
        </View>
      </View>

      {/* Jobs List */}
      <Text className="text-lg font-semibold mb-2">Today's Jobs</Text>
      <ScrollView className="max-h-[300px]">
        {scheduledJobs.map((job) => (
          <TouchableOpacity
            key={job.id}
            className={`p-3 mb-2 rounded-md flex-row items-center ${getJobStatusColor(
              job.status
            )}`}
            onPress={() => onJobSelect(job.id)}
          >
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Clock size={16} color="#4b5563" />
                <Text className="ml-1 text-gray-700">{job.time}</Text>
              </View>

              <View className="flex-row items-center mb-1">
                <MapPin size={16} color="#4b5563" />
                <Text className="ml-1 text-gray-700 flex-shrink">
                  {job.address}
                </Text>
              </View>

              <Text className="text-gray-900 font-medium">{job.service}</Text>

              <View className="flex-row items-center mt-1">
                <User size={16} color="#4b5563" />
                <Text className="ml-1 text-gray-700">{job.technician}</Text>
              </View>
            </View>

            <View className="ml-2">{getStatusIndicator(job.status)}</View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const getJobStatusColor = (status: JobSummary["status"]) => {
  switch (status) {
    case "scheduled":
      return "bg-gray-100";
    case "in-progress":
      return "bg-blue-50";
    case "completed":
      return "bg-green-50";
    case "issue":
      return "bg-red-50";
    default:
      return "bg-gray-100";
  }
};

const getStatusIndicator = (status: JobSummary["status"]) => {
  switch (status) {
    case "scheduled":
      return (
        <Text className="text-gray-600 text-xs font-medium">Scheduled</Text>
      );
    case "in-progress":
      return (
        <Text className="text-blue-600 text-xs font-medium">In Progress</Text>
      );
    case "completed":
      return (
        <Text className="text-green-600 text-xs font-medium">Completed</Text>
      );
    case "issue":
      return <Text className="text-red-600 text-xs font-medium">Issue</Text>;
    default:
      return null;
  }
};

export default TodayOverview;
