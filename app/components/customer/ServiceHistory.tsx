import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import {
  Star,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  X,
  ChevronRight,
} from "lucide-react-native";
import { format, parseISO, isValid } from "date-fns";
import { createReview, Booking } from "../../../lib/data";
import { useAuth } from "../../../lib/auth";

interface ServiceHistoryProps {
  services?: Booking[];
  onRefresh?: () => void;
}

const ServiceHistory = ({ services = [], onRefresh }: ServiceHistoryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "recent" | "past">(
    "all"
  );
  const [expandedServices, setExpandedServices] = useState<
    Record<string, boolean>
  >({});
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  // Format date to a readable string
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) {
        return dateString;
      }
      return format(date, "MMMM d, yyyy");
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString;
    }
  };

  // Format price to currency
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // Handle refreshing
  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  // Toggle expanded view for a service
  const toggleServiceExpansion = (id: string) => {
    setExpandedServices((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Handle rating a service
  const handleRateService = async (bookingId: string, rating: number) => {
    try {
      if (!user) {
        Alert.alert("Error", "You must be logged in to rate a service");
        return;
      }

      const booking = services.find((b) => b.id === bookingId);
      if (!booking || !booking.technician_id) {
        Alert.alert(
          "Error",
          "Could not find booking or technician information"
        );
        return;
      }

      // Create the review
      await createReview({
        booking_id: bookingId,
        customer_id: user.id,
        technician_id: booking.technician_id,
        rating: rating,
      });

      Alert.alert("Success", "Thank you for your rating!");

      // Refresh the list if onRefresh is available
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error("Error rating service:", error);
      Alert.alert("Error", error.message || "Failed to submit rating");
    }
  };

  // Render the rating stars component
  const renderRatingStars = (booking: Booking) => {
    const currentRating = booking.review?.rating || 0;

    return (
      <View className="flex-row mt-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRateService(booking.id, star)}
            disabled={!!booking.review}
            className="mr-1"
          >
            <Star
              size={20}
              color={star <= currentRating ? "#FFD700" : "#D1D5DB"}
              fill={star <= currentRating ? "#FFD700" : "transparent"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Filter services based on search, date, and status
  const filteredServices = services.filter((booking) => {
    // Text search filter
    const searchTerms = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !searchTerms ||
      booking.service?.name.toLowerCase().includes(searchTerms) ||
      (booking.notes && booking.notes.toLowerCase().includes(searchTerms)) ||
      booking.status.toLowerCase().includes(searchTerms);

    // Status filter
    const matchesStatus = !statusFilter || booking.status === statusFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter === "recent") {
      const serviceDate = new Date(booking.scheduled_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesDate = serviceDate >= thirtyDaysAgo;
    } else if (dateFilter === "past") {
      const serviceDate = new Date(booking.scheduled_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesDate = serviceDate < thirtyDaysAgo;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <View className="flex-1 bg-white">
      {/* Search and Filter Bar */}
      <View className="p-4 border-b border-gray-200">
        <View className="flex-row bg-gray-100 rounded-lg p-2 mb-3">
          <Search size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2"
            placeholder="Search services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="flex-row justify-between">
          <TouchableOpacity
            className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2"
            onPress={() => setFilterVisible(!filterVisible)}
          >
            <Filter size={16} color="#6b7280" />
            <Text className="ml-2 text-gray-700">Filter</Text>
            <ChevronDown size={16} color="#6b7280" className="ml-1" />
          </TouchableOpacity>

          <View className="flex-row">
            <TouchableOpacity
              className={`px-3 py-2 rounded-lg mr-2 ${
                dateFilter === "all" ? "bg-green-500" : "bg-gray-100"
              }`}
              onPress={() => setDateFilter("all")}
            >
              <Text
                className={
                  dateFilter === "all" ? "text-white" : "text-gray-700"
                }
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-3 py-2 rounded-lg mr-2 ${
                dateFilter === "recent" ? "bg-green-500" : "bg-gray-100"
              }`}
              onPress={() => setDateFilter("recent")}
            >
              <Text
                className={
                  dateFilter === "recent" ? "text-white" : "text-gray-700"
                }
              >
                Recent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-3 py-2 rounded-lg ${
                dateFilter === "past" ? "bg-green-500" : "bg-gray-100"
              }`}
              onPress={() => setDateFilter("past")}
            >
              <Text
                className={
                  dateFilter === "past" ? "text-white" : "text-gray-700"
                }
              >
                Past
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {filterVisible && (
          <View className="mt-3 bg-white border border-gray-200 rounded-lg p-3">
            <Text className="font-semibold mb-2">Filter by Status</Text>
            <View className="flex-row flex-wrap">
              {[
                "pending",
                "scheduled",
                "in_progress",
                "completed",
                "cancelled",
              ].map((status) => (
                <TouchableOpacity
                  key={status}
                  className={`mr-2 mb-2 px-3 py-1 rounded-full ${
                    statusFilter === status ? "bg-green-500" : "bg-gray-100"
                  }`}
                  onPress={() =>
                    setStatusFilter(statusFilter === status ? null : status)
                  }
                >
                  <Text
                    className={
                      statusFilter === status ? "text-white" : "text-gray-700"
                    }
                  >
                    {status.charAt(0).toUpperCase() +
                      status.slice(1).replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Service History List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredServices.length === 0 ? (
          <View className="p-8 items-center justify-center">
            <Text className="text-gray-500 text-center">
              No service history found matching your criteria.
            </Text>
          </View>
        ) : (
          filteredServices.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              className="p-4 border-b border-gray-200"
              onPress={() => toggleServiceExpansion(booking.id)}
              activeOpacity={0.7}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-semibold">
                    {booking.service?.name || "Unknown Service"}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Calendar size={16} color="#6b7280" />
                    <Text className="ml-2 text-gray-600">
                      {formatDate(booking.scheduled_date)}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-gray-700 font-semibold">
                      {formatCurrency(booking.price)}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-full ${
                        booking.status === "completed"
                          ? "bg-green-100"
                          : booking.status === "cancelled"
                          ? "bg-red-100"
                          : booking.status === "in_progress"
                          ? "bg-blue-100"
                          : booking.status === "scheduled"
                          ? "bg-purple-100"
                          : "bg-yellow-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          booking.status === "completed"
                            ? "text-green-800"
                            : booking.status === "cancelled"
                            ? "text-red-800"
                            : booking.status === "in_progress"
                            ? "text-blue-800"
                            : booking.status === "scheduled"
                            ? "text-purple-800"
                            : "text-yellow-800"
                        }`}
                      >
                        {booking.status.charAt(0).toUpperCase() +
                          booking.status.slice(1).replace("_", " ")}
                      </Text>
                    </View>
                  </View>
                </View>
                <ChevronRight
                  size={20}
                  color="#9ca3af"
                  style={{
                    transform: [
                      {
                        rotate: expandedServices[booking.id] ? "90deg" : "0deg",
                      },
                    ],
                  }}
                />
              </View>

              {expandedServices[booking.id] && (
                <View className="mt-4 pt-4 border-t border-gray-200">
                  {booking.status === "completed" && (
                    <View>
                      <Text className="font-semibold mb-2">
                        Rate this service:
                      </Text>
                      {renderRatingStars(booking)}
                    </View>
                  )}

                  <View className="mt-3">
                    <Text className="font-semibold mb-2">Service Details:</Text>
                    <View className="bg-gray-50 p-3 rounded-lg">
                      <Text className="text-gray-700 mb-1">
                        <Text className="font-semibold">Time: </Text>
                        {booking.scheduled_time}
                      </Text>
                      <Text className="text-gray-700 mb-1">
                        <Text className="font-semibold">Address: </Text>
                        {booking.address || "No address provided"}
                      </Text>
                      {booking.notes && (
                        <Text className="text-gray-700">
                          <Text className="font-semibold">Notes: </Text>
                          {booking.notes}
                        </Text>
                      )}
                    </View>
                  </View>

                  {booking.technician && (
                    <View className="mt-3">
                      <Text className="font-semibold mb-2">
                        Service Provider:
                      </Text>
                      <View className="flex-row items-center bg-gray-50 p-3 rounded-lg">
                        <View className="w-10 h-10 bg-gray-300 rounded-full mr-3"></View>
                        <View>
                          <Text className="font-medium">
                            {booking.technician.first_name}{" "}
                            {booking.technician.last_name}
                          </Text>
                          <Text className="text-gray-600 text-sm">
                            Technician
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default ServiceHistory;
