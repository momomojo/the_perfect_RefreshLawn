import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { MapPin, Clock, ChevronRight, CheckCircle } from "lucide-react-native";

interface Job {
  id: string;
  customerName: string;
  address: string;
  time: string;
  serviceType: string;
  status: "pending" | "in-progress" | "completed";
  propertyImage: string;
}

interface TodayJobsProps {
  jobs?: Job[];
  onJobSelect?: (jobId: string) => void;
}

const TodayJobs = ({
  jobs = [
    {
      id: "1",
      customerName: "John Smith",
      address: "123 Main St, Anytown, USA",
      time: "9:00 AM - 10:30 AM",
      serviceType: "Lawn Mowing",
      status: "pending",
      propertyImage:
        "https://images.unsplash.com/photo-1560749003-f4b1e17e2dfd?w=400&q=80",
    },
    {
      id: "2",
      customerName: "Sarah Johnson",
      address: "456 Oak Ave, Somewhere, USA",
      time: "11:00 AM - 12:30 PM",
      serviceType: "Hedge Trimming",
      status: "in-progress",
      propertyImage:
        "https://images.unsplash.com/photo-1621944190310-e3cca1564bd7?w=400&q=80",
    },
    {
      id: "3",
      customerName: "Michael Brown",
      address: "789 Pine Rd, Elsewhere, USA",
      time: "2:00 PM - 4:00 PM",
      serviceType: "Full Garden Maintenance",
      status: "pending",
      propertyImage:
        "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400&q=80",
    },
    {
      id: "4",
      customerName: "Emily Davis",
      address: "321 Elm St, Nowhere, USA",
      time: "4:30 PM - 5:30 PM",
      serviceType: "Lawn Mowing",
      status: "pending",
      propertyImage:
        "https://images.unsplash.com/photo-1597074866923-dc0589150358?w=400&q=80",
    },
  ],
  onJobSelect = (jobId) => console.log(`Job ${jobId} selected`),
}: TodayJobsProps) => {
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "in-progress" | "completed"
  >("all");

  const filteredJobs =
    activeFilter === "all"
      ? jobs
      : jobs.filter((job) => job.status === activeFilter);

  const getStatusColor = (status: Job["status"]) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: Job["status"]) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "in-progress":
        return "In Progress";
      case "completed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  return (
    <View className="bg-white p-4 rounded-lg shadow-sm">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold text-gray-800">Today's Jobs</Text>
        <View className="flex-row bg-gray-100 rounded-full p-1">
          <TouchableOpacity
            onPress={() => setActiveFilter("all")}
            className={`px-3 py-1 rounded-full ${activeFilter === "all" ? "bg-white shadow-sm" : ""}`}
          >
            <Text
              className={`${activeFilter === "all" ? "text-blue-600" : "text-gray-600"}`}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveFilter("pending")}
            className={`px-3 py-1 rounded-full ${activeFilter === "pending" ? "bg-white shadow-sm" : ""}`}
          >
            <Text
              className={`${activeFilter === "pending" ? "text-blue-600" : "text-gray-600"}`}
            >
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveFilter("in-progress")}
            className={`px-3 py-1 rounded-full ${activeFilter === "in-progress" ? "bg-white shadow-sm" : ""}`}
          >
            <Text
              className={`${activeFilter === "in-progress" ? "text-blue-600" : "text-gray-600"}`}
            >
              In Progress
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveFilter("completed")}
            className={`px-3 py-1 rounded-full ${activeFilter === "completed" ? "bg-white shadow-sm" : ""}`}
          >
            <Text
              className={`${activeFilter === "completed" ? "text-blue-600" : "text-gray-600"}`}
            >
              Completed
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredJobs.length === 0 ? (
        <View className="py-8 items-center justify-center">
          <Text className="text-gray-500 text-center">
            No jobs found for the selected filter.
          </Text>
        </View>
      ) : (
        <ScrollView className="max-h-96">
          {filteredJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              className="bg-white border border-gray-200 rounded-lg mb-3 overflow-hidden"
              onPress={() => onJobSelect(job.id)}
            >
              <View className="flex-row">
                <Image
                  source={{ uri: job.propertyImage }}
                  className="w-24 h-full"
                  style={{ height: 100 }}
                />
                <View className="flex-1 p-3">
                  <View className="flex-row justify-between items-start">
                    <Text className="text-lg font-semibold text-gray-800">
                      {job.serviceType}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-full ${getStatusColor(job.status)}`}
                    >
                      <Text className="text-xs font-medium">
                        {getStatusText(job.status)}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-600 mt-1">{job.customerName}</Text>
                  <View className="flex-row items-center mt-2">
                    <MapPin size={14} color="#6b7280" />
                    <Text
                      className="text-gray-500 text-xs ml-1"
                      numberOfLines={1}
                    >
                      {job.address}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-1">
                    <Clock size={14} color="#6b7280" />
                    <Text className="text-gray-500 text-xs ml-1">
                      {job.time}
                    </Text>
                  </View>
                </View>
                <View className="justify-center pr-2">
                  <ChevronRight size={20} color="#9ca3af" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View className="mt-4 border-t border-gray-200 pt-3">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <CheckCircle size={16} color="#10b981" />
            <Text className="text-gray-700 ml-1 font-medium">
              {jobs.filter((job) => job.status === "completed").length} of{" "}
              {jobs.length} completed
            </Text>
          </View>
          <TouchableOpacity>
            <Text className="text-blue-600 font-medium">View All Jobs</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default TodayJobs;
