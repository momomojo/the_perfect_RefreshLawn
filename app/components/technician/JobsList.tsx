import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Calendar,
  Filter,
  Search,
  MapPin,
  Clock,
  ChevronRight,
  AlertCircle,
} from "lucide-react-native";
import { getTechnicianBookings } from "../../../lib/data";
import { useAuth } from "../../../lib/auth";
import { format, parseISO } from "date-fns";

interface Job {
  id: string;
  customerName: string;
  address: string;
  date: string;
  time: string;
  serviceType: string;
  status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
}

const JobsList = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadJobs = async () => {
      try {
        setLoading(true);
        // Get all technician bookings from Supabase
        const bookings = await getTechnicianBookings(user.id);

        // Map the bookings to the Job interface format
        const mappedJobs = bookings.map((booking) => ({
          id: booking.id,
          customerName:
            booking.customer?.first_name + " " + booking.customer?.last_name,
          address: booking.address || "",
          date: booking.scheduled_date,
          time: format(
            new Date(`2000-01-01T${booking.scheduled_time}`),
            "h:mm a"
          ),
          serviceType: booking.service?.name || "",
          status: booking.status as any, // Cast to match the Job interface
        }));

        setJobs(mappedJobs);
      } catch (err) {
        console.error("Error loading technician jobs:", err);
        setError("Failed to load jobs");
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [user?.id]);

  // Filter jobs based on search query and status filter
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.serviceType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterStatus ? job.status === filterStatus : true;

    return matchesSearch && matchesFilter;
  });

  // Sort jobs based on sortBy state
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === "date") {
      return (
        new Date(a.date + "T" + a.time).getTime() -
        new Date(b.date + "T" + b.time).getTime()
      );
    } else {
      // Sort by status priority: in_progress, scheduled, pending, completed, cancelled
      const statusPriority = {
        in_progress: 0,
        scheduled: 1,
        pending: 2,
        completed: 3,
        cancelled: 4,
      };
      return statusPriority[a.status] - statusPriority[b.status];
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleJobPress = (jobId: string) => {
    router.push(`/(technician)/job-details/${jobId}`);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-gray-500 mt-2">Loading jobs...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-white justify-center items-center p-4">
        <AlertCircle size={40} color="#ef4444" />
        <Text className="text-red-500 text-center mt-2">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Search and Filter Bar */}
      <View className="p-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <Search size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-800"
            placeholder="Search jobs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row justify-between">
          {/* Filter Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
          >
            <TouchableOpacity
              className={`flex-row items-center mr-2 px-3 py-1 rounded-full ${
                filterStatus === null ? "bg-blue-500" : "bg-gray-200"
              }`}
              onPress={() => setFilterStatus(null)}
            >
              <Text
                className={`${
                  filterStatus === null ? "text-white" : "text-gray-800"
                }`}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-row items-center mr-2 px-3 py-1 rounded-full ${
                filterStatus === "pending" ? "bg-blue-500" : "bg-gray-200"
              }`}
              onPress={() => setFilterStatus("pending")}
            >
              <Text
                className={`${
                  filterStatus === "pending" ? "text-white" : "text-gray-800"
                }`}
              >
                Pending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-row items-center mr-2 px-3 py-1 rounded-full ${
                filterStatus === "scheduled" ? "bg-blue-500" : "bg-gray-200"
              }`}
              onPress={() => setFilterStatus("scheduled")}
            >
              <Text
                className={`${
                  filterStatus === "scheduled" ? "text-white" : "text-gray-800"
                }`}
              >
                Scheduled
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-row items-center mr-2 px-3 py-1 rounded-full ${
                filterStatus === "in_progress" ? "bg-blue-500" : "bg-gray-200"
              }`}
              onPress={() => setFilterStatus("in_progress")}
            >
              <Text
                className={`${
                  filterStatus === "in_progress"
                    ? "text-white"
                    : "text-gray-800"
                }`}
              >
                In Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-row items-center mr-2 px-3 py-1 rounded-full ${
                filterStatus === "completed" ? "bg-blue-500" : "bg-gray-200"
              }`}
              onPress={() => setFilterStatus("completed")}
            >
              <Text
                className={`${
                  filterStatus === "completed" ? "text-white" : "text-gray-800"
                }`}
              >
                Completed
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Sort Button */}
          <TouchableOpacity
            className="flex-row items-center px-3 py-1 rounded-full bg-gray-200"
            onPress={() => setSortBy(sortBy === "date" ? "status" : "date")}
          >
            <Filter size={16} color="#4b5563" />
            <Text className="ml-1 text-gray-800">
              {sortBy === "date" ? "By Date" : "By Status"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Jobs List */}
      <ScrollView className="flex-1">
        {sortedJobs.length > 0 ? (
          sortedJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              className="p-4 border-b border-gray-200 bg-white"
              onPress={() => handleJobPress(job.id)}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-800">
                    {job.customerName}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <MapPin size={16} color="#6b7280" />
                    <Text className="ml-1 text-gray-600 flex-1">
                      {job.address}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-1">
                    <Calendar size={16} color="#6b7280" />
                    <Text className="ml-1 text-gray-600">
                      {format(new Date(job.date), "MMM d, yyyy")}
                    </Text>
                    <Clock size={16} color="#6b7280" className="ml-3" />
                    <Text className="ml-1 text-gray-600">{job.time}</Text>
                  </View>
                  <Text className="mt-2 text-gray-700">{job.serviceType}</Text>
                </View>
                <View className="flex-row items-center">
                  <View
                    className={`px-2 py-1 rounded-full ${getStatusColor(
                      job.status
                    )}`}
                  >
                    <Text className="text-xs font-medium capitalize">
                      {job.status.replace("_", " ")}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#9ca3af" className="ml-2" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="p-4 items-center justify-center">
            <Text className="text-gray-500 text-center">
              No jobs found matching your criteria
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default JobsList;
