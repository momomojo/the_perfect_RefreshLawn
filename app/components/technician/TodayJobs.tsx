import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { MapPin, Clock, ChevronRight, CheckCircle } from "lucide-react-native";
import { getTechnicianBookings } from "../../../lib/data";
import { useAuth } from "../../../lib/auth";
import { format } from "date-fns";

interface Job {
  id: string;
  customerName: string;
  address: string;
  time: string;
  serviceType: string;
  status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
  propertyImage?: string;
}

interface TodayJobsProps {
  onJobSelect?: (jobId: string) => void;
}

const TodayJobs = ({
  onJobSelect = (jobId) => console.log(`Job ${jobId} selected`),
}: TodayJobsProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "scheduled" | "in_progress" | "completed" | "cancelled"
  >("all");

  useEffect(() => {
    if (!user?.id) return;

    const loadTodayJobs = async () => {
      try {
        setLoading(true);
        // Get all technician bookings from Supabase
        const bookings = await getTechnicianBookings(user.id);

        // Filter for today's jobs only
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const todaysBookings = bookings.filter(
          (booking) => booking.scheduled_date === today
        );

        // Map the bookings to the Job interface format
        const mappedJobs = todaysBookings.map((booking) => ({
          id: booking.id,
          customerName:
            booking.customer?.first_name + " " + booking.customer?.last_name,
          address: booking.address || "",
          time: `${format(
            new Date(`2000-01-01T${booking.scheduled_time}`),
            "h:mm a"
          )}`,
          serviceType: booking.service?.name || "",
          status: booking.status as any, // Cast to match the Job interface
          propertyImage:
            "https://images.unsplash.com/photo-1560749003-f4b1e17e2dfd?w=400&q=80", // Default image
        }));

        setJobs(mappedJobs);
      } catch (err) {
        console.error("Error loading technician jobs:", err);
        setError("Failed to load jobs");
      } finally {
        setLoading(false);
      }
    };

    loadTodayJobs();
  }, [user?.id]);

  const filteredJobs =
    activeFilter === "all"
      ? jobs
      : jobs.filter((job) => job.status === activeFilter);

  const getStatusColor = (status: Job["status"]) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: Job["status"]) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "scheduled":
        return "Scheduled";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  if (loading) {
    return (
      <View
        className="bg-white p-4 rounded-lg shadow-sm justify-center items-center"
        style={{ height: 150 }}
      >
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-gray-500 mt-2">Loading jobs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-white p-4 rounded-lg shadow-sm">
        <Text className="text-red-500 text-center">{error}</Text>
      </View>
    );
  }

  return (
    <View className="bg-white p-4 rounded-lg shadow-sm">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold text-gray-800">Today's Jobs</Text>
        <View className="flex-row bg-gray-100 rounded-full p-1">
          <TouchableOpacity
            onPress={() => setActiveFilter("all")}
            className={`px-3 py-1 rounded-full ${
              activeFilter === "all" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`${
                activeFilter === "all" ? "text-blue-600" : "text-gray-600"
              }`}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveFilter("pending")}
            className={`px-3 py-1 rounded-full ${
              activeFilter === "pending" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`${
                activeFilter === "pending" ? "text-blue-600" : "text-gray-600"
              }`}
            >
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveFilter("in_progress")}
            className={`px-3 py-1 rounded-full ${
              activeFilter === "in_progress" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`${
                activeFilter === "in_progress"
                  ? "text-blue-600"
                  : "text-gray-600"
              }`}
            >
              In Progress
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveFilter("completed")}
            className={`px-3 py-1 rounded-full ${
              activeFilter === "completed" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`${
                activeFilter === "completed" ? "text-blue-600" : "text-gray-600"
              }`}
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
                      className={`px-2 py-1 rounded-full ${getStatusColor(
                        job.status
                      )}`}
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
