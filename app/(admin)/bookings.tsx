import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { Stack, router } from "expo-router";
import {
  CalendarDays,
  Search,
  ChevronRight,
  UserCheck,
  Clock,
  Filter,
} from "lucide-react-native";
import { getAllBookings, Booking } from "../../lib/data";
import { format, parseISO } from "date-fns";

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    // Apply filters when bookings, searchQuery, or statusFilter changes
    let filtered = [...bookings];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (booking) =>
          booking.customer?.first_name?.toLowerCase().includes(query) ||
          booking.customer?.last_name?.toLowerCase().includes(query) ||
          booking.service?.name?.toLowerCase().includes(query) ||
          booking.address?.toLowerCase().includes(query) ||
          booking.id.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [bookings, searchQuery, statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await getAllBookings();

      // Sort bookings by date, with most recent first
      const sorted = data.sort((a, b) => {
        return (
          new Date(b.scheduled_date).getTime() -
          new Date(a.scheduled_date).getTime()
        );
      });

      setBookings(sorted);
      setFilteredBookings(sorted);
      setError(null);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const viewBookingDetails = (bookingId: string) => {
    router.push(`/booking/${bookingId}`);
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    return (
      <TouchableOpacity
        className="bg-white border border-gray-200 rounded-lg mb-3 p-4 shadow-sm"
        onPress={() => viewBookingDetails(item.id)}
      >
        <View className="flex-row justify-between items-start mb-2">
          <View>
            <Text className="text-lg font-semibold text-gray-800">
              {item.service?.name || "Unknown Service"}
            </Text>
            <Text className="text-gray-600">
              {item.customer?.first_name
                ? `${item.customer.first_name} ${item.customer.last_name}`
                : "Unknown Customer"}
            </Text>
          </View>
          <View
            className={`px-2 py-1 rounded-full border ${getStatusColor(
              item.status
            )}`}
          >
            <Text className="text-xs font-medium capitalize">
              {item.status}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mb-1">
          <CalendarDays size={16} color="#6b7280" className="mr-2" />
          <Text className="text-gray-600 text-sm">
            {format(new Date(item.scheduled_date), "EEE, MMM d, yyyy")}
          </Text>
        </View>

        <View className="flex-row items-center mb-2">
          <Clock size={16} color="#6b7280" className="mr-2" />
          <Text className="text-gray-600 text-sm">{item.scheduled_time}</Text>
        </View>

        {item.address && (
          <View className="mb-3 pb-3 border-b border-gray-100">
            <Text className="text-gray-500 text-sm">{item.address}</Text>
          </View>
        )}

        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <UserCheck size={16} color="#6b7280" className="mr-1" />
            <Text className="text-gray-600 text-sm">
              {item.technician
                ? `${item.technician.first_name} ${item.technician.last_name}`
                : "Unassigned"}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-gray-600 text-sm mr-1">
              ${parseFloat(item.price.toString()).toFixed(2)}
            </Text>
            <ChevronRight size={16} color="#6b7280" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: "Bookings",
          headerShown: true,
        }}
      />

      {/* Search and Filter Bar */}
      <View className="p-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg mb-3">
          <Search size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            placeholder="Search bookings..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row justify-between">
          <ScrollableStatusFilter
            selectedStatus={statusFilter}
            onSelectStatus={(status) =>
              setStatusFilter(status === statusFilter ? null : status)
            }
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-4 text-gray-600">Loading bookings...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500 text-center mb-4">{error}</Text>
          <TouchableOpacity
            onPress={fetchBookings}
            className="bg-blue-500 px-4 py-2 rounded-md"
          >
            <Text className="text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-gray-500 text-center mb-2">
            No bookings found
          </Text>
          <Text className="text-gray-400 text-center">
            {searchQuery || statusFilter
              ? "Try adjusting your filters"
              : "Your bookings will appear here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// Horizontal scrollable filter for booking statuses
function ScrollableStatusFilter({
  selectedStatus,
  onSelectStatus,
}: {
  selectedStatus: string | null;
  onSelectStatus: (status: string) => void;
}) {
  const statuses = [
    "pending",
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-row"
    >
      {statuses.map((status) => (
        <TouchableOpacity
          key={status}
          onPress={() => onSelectStatus(status)}
          className={`mr-2 px-3 py-1 border rounded-full ${
            selectedStatus === status
              ? getStatusColor(status)
              : "bg-white border-gray-300"
          }`}
        >
          <Text
            className={`text-xs font-medium capitalize ${
              selectedStatus === status
                ? getStatusColor(status).split(" ")[1]
                : "text-gray-700"
            }`}
          >
            {status}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
