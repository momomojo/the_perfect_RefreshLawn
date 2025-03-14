import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { ArrowLeft, MapPin } from "lucide-react-native";
import JobDetail from "../../components/technician/JobDetail";
import JobStatusUpdater from "../../components/technician/JobStatusUpdater";

interface JobDetailsProps {}

export default function JobDetailsScreen({}: JobDetailsProps) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [currentStatus, setCurrentStatus] = useState<
    "scheduled" | "in-progress" | "completed" | "cancelled"
  >("scheduled");

  // Mock job data - in a real app, this would be fetched based on the id parameter
  const jobData = {
    jobId: id || "JOB-1234",
    customerName: "Sarah Johnson",
    customerPhone: "(555) 987-6543",
    customerEmail: "sarah.johnson@example.com",
    address: "456 Green Street, Lawn Heights, LH 54321",
    serviceType: "Full Lawn Service + Edging",
    scheduledDate: "July 10, 2023",
    scheduledTime: "2:00 PM - 4:00 PM",
    estimatedDuration: "2 hours",
    propertySize: "0.35 acres",
    specialInstructions:
      "Gate code is 1234. Please avoid the flower beds on the east side of the property. Customer prefers no chemical treatments near vegetable garden.",
    propertyImage:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80",
    status: currentStatus,
  };

  const handleStatusUpdate = (status: string, data?: any) => {
    setCurrentStatus(
      status as "scheduled" | "in-progress" | "completed" | "cancelled",
    );
    // In a real app, you would send this update to your backend
    console.log("Status updated to:", status, data);

    // If job is completed, you might want to navigate back to the jobs list after a delay
    if (status === "completed") {
      setTimeout(() => {
        router.push("/jobs");
      }, 1500);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerTitle: `Job #${id}`,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Navigation indicator */}
          <View className="flex-row items-center mb-4">
            <MapPin size={16} color="#6b7280" />
            <Text className="text-gray-500 ml-1">Job Details</Text>
          </View>

          {/* Job Details Component */}
          <JobDetail {...jobData} />

          {/* Job Status Updater Component */}
          <View className="my-6">
            <JobStatusUpdater
              jobId={id}
              currentStatus={currentStatus}
              onStatusUpdate={handleStatusUpdate}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
