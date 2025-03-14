import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Calendar,
  Filter,
  Search,
  MapPin,
  Clock,
  ChevronRight,
} from "lucide-react-native";

interface Job {
  id: string;
  customerName: string;
  address: string;
  date: string;
  time: string;
  serviceType: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
}

interface JobsListProps {
  jobs?: Job[];
}

const JobsList = ({ jobs = [] }: JobsListProps) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "status">("date");

  // Default jobs if none provided
  const defaultJobs: Job[] = [
    {
      id: "1",
      customerName: "John Smith",
      address: "123 Main St, Anytown, USA",
      date: "2023-06-15",
      time: "09:00 AM",
      serviceType: "Lawn Mowing",
      status: "scheduled",
    },
    {
      id: "2",
      customerName: "Sarah Johnson",
      address: "456 Oak Ave, Somewhere, USA",
      date: "2023-06-15",
      time: "01:30 PM",
      serviceType: "Hedge Trimming",
      status: "in-progress",
    },
    {
      id: "3",
      customerName: "Michael Brown",
      address: "789 Pine Rd, Elsewhere, USA",
      date: "2023-06-16",
      time: "10:15 AM",
      serviceType: "Lawn Mowing & Fertilization",
      status: "scheduled",
    },
    {
      id: "4",
      customerName: "Emily Davis",
      address: "321 Cedar Ln, Nowhere, USA",
      date: "2023-06-14",
      time: "03:45 PM",
      serviceType: "Garden Cleanup",
      status: "completed",
    },
    {
      id: "5",
      customerName: "Robert Wilson",
      address: "654 Maple Dr, Anywhere, USA",
      date: "2023-06-17",
      time: "11:30 AM",
      serviceType: "Lawn Mowing",
      status: "scheduled",
    },
  ];

  const allJobs = jobs.length > 0 ? jobs : defaultJobs;

  // Filter jobs based on search query and status filter
  const filteredJobs = allJobs.filter((job) => {
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
        new Date(a.date + " " + a.time).getTime() -
        new Date(b.date + " " + b.time).getTime()
      );
    } else {
      // Sort by status priority: in-progress, scheduled, completed, cancelled
      const statusPriority = {
        "in-progress": 0,
        scheduled: 1,
        completed: 2,
        cancelled: 3,
      };
      return statusPriority[a.status] - statusPriority[b.status];
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleJobPress = (jobId: string) => {
    router.push(`/job-details/${jobId}`);
  };

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
          <View className="flex-row">
            <TouchableOpacity
              className={`flex-row items-center mr-2 px-3 py-1 rounded-full ${filterStatus === null ? "bg-blue-500" : "bg-gray-200"}`}
              onPress={() => setFilterStatus(null)}
            >
              <Text
                className={`${filterStatus === null ? "text-white" : "text-gray-800"}`}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-row items-center mr-2 px-3 py-1 rounded-full ${filterStatus === "scheduled" ? "bg-blue-500" : "bg-gray-200"}`}
              onPress={() => setFilterStatus("scheduled")}
            >
              <Text
                className={`${filterStatus === "scheduled" ? "text-white" : "text-gray-800"}`}
              >
                Scheduled
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-row items-center mr-2 px-3 py-1 rounded-full ${filterStatus === "in-progress" ? "bg-blue-500" : "bg-gray-200"}`}
              onPress={() => setFilterStatus("in-progress")}
            >
              <Text
                className={`${filterStatus === "in-progress" ? "text-white" : "text-gray-800"}`}
              >
                In Progress
              </Text>
            </TouchableOpacity>
          </View>

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
                    <Text className="ml-1 text-gray-600">{job.date}</Text>
                    <Clock size={16} color="#6b7280" className="ml-3" />
                    <Text className="ml-1 text-gray-600">{job.time}</Text>
                  </View>
                  <Text className="mt-2 text-gray-700">{job.serviceType}</Text>
                </View>
                <View className="flex-row items-center">
                  <View
                    className={`px-2 py-1 rounded-full ${getStatusColor(job.status)}`}
                  >
                    <Text className="text-xs font-medium capitalize">
                      {job.status.replace("-", " ")}
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
