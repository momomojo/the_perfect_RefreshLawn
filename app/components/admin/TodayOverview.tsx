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
import { Booking } from "../../../lib/data";

interface JobSummary {
  id: string;
  time: string;
  address: string;
  service: string;
  technician: string;
  status: Booking["status"] | "issue";
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
      status: "in_progress",
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
    case "pending":
    case "pending_payment":
    case "payment_processing":
    case "payment_confirmed":
      return "bg-gray-100";
    case "in_progress":
      return "bg-blue-50";
    case "completed":
      return "bg-green-50";
    case "issue":
      return "bg-red-50";
    case "cancelled":
    case "payment_failed":
    case "payment_refunded":
    case "refunded":
      return "bg-red-100";
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
    case "pending":
      return <Text className="text-gray-600 text-xs font-medium">Pending</Text>;
    case "pending_payment":
      return (
        <Text className="text-amber-600 text-xs font-medium">
          Pending Payment
        </Text>
      );
    case "payment_processing":
      return (
        <Text className="text-blue-600 text-xs font-medium">
          Processing Payment
        </Text>
      );
    case "payment_confirmed":
      return (
        <Text className="text-blue-600 text-xs font-medium">
          Payment Confirmed
        </Text>
      );
    case "in_progress":
      return (
        <Text className="text-blue-600 text-xs font-medium">In Progress</Text>
      );
    case "completed":
      return (
        <Text className="text-green-600 text-xs font-medium">Completed</Text>
      );
    case "issue":
      return <Text className="text-red-600 text-xs font-medium">Issue</Text>;
    case "cancelled":
      return (
        <Text className="text-red-600 text-xs font-medium">Cancelled</Text>
      );
    case "payment_failed":
      return (
        <Text className="text-red-600 text-xs font-medium">Payment Failed</Text>
      );
    case "payment_refunded":
      return (
        <Text className="text-red-600 text-xs font-medium">
          Payment Refunded
        </Text>
      );
    case "refunded":
      return <Text className="text-red-600 text-xs font-medium">Refunded</Text>;
    default:
      const _exhaustiveCheck: never = status;
      return null;
  }
};

export default TodayOverview;
