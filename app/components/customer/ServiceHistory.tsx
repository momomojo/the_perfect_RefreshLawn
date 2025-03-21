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
import { rateBooking } from "../../lib/data";

interface ServiceHistoryItem {
  id: string;
  scheduled_date: string;
  service: {
    name: string;
    id: string;
  };
  technician?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  status: string;
  price: number;
  rating?: number;
  before_image?: string;
  after_image?: string;
  notes?: string;
}

interface ServiceHistoryProps {
  services?: ServiceHistoryItem[];
  onRefresh?: () => void;
}

const ServiceHistory = ({ services = [], onRefresh }: ServiceHistoryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingRating, setSubmittingRating] = useState<string | null>(null);

  // Filter services based on search query and selected filter
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.service?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      service.technician?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      false;

    if (selectedFilter === "all") return matchesSearch;
    if (selectedFilter === "completed")
      return matchesSearch && service.status === "completed";
    if (selectedFilter === "cancelled")
      return matchesSearch && service.status === "cancelled";
    return matchesSearch;
  });

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  const toggleServiceExpansion = (id: string) => {
    if (expandedService === id) {
      setExpandedService(null);
    } else {
      setExpandedService(id);
    }
  };

  const handleRateService = async (bookingId: string, rating: number) => {
    try {
      setSubmittingRating(bookingId);

      const { error } = await rateBooking(bookingId, rating);

      if (error) {
        Alert.alert("Error", error.message || "Failed to submit rating");
        return;
      }

      // Refresh booking history to get updated data
      if (onRefresh) {
        await onRefresh();
      }

      Alert.alert("Success", "Thank you for your rating!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit rating");
    } finally {
      setSubmittingRating(null);
    }
  };

  const renderRatingStars = (service: ServiceHistoryItem) => {
    const isRated = !!service.rating;
    const isCompleted = service.status === "completed";

    if (!isCompleted) return null;

    return (
      <View className="mt-2">
        {isRated ? (
          <View className="flex-row">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                fill={star <= (service.rating || 0) ? "#FFD700" : "transparent"}
                color={star <= (service.rating || 0) ? "#FFD700" : "#D1D5DB"}
              />
            ))}
          </View>
        ) : (
          <View>
            <Text className="text-gray-700 font-medium mb-1">
              Rate this service:
            </Text>
            <View className="flex-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRateService(service.id, star)}
                  disabled={submittingRating === service.id}
                  className="mr-1"
                >
                  <Star
                    size={22}
                    fill="transparent"
                    color={
                      submittingRating === service.id ? "#9CA3AF" : "#FFD700"
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, "MMMM d, yyyy") : dateString;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <View className="flex-1 bg-white">
      {/* Search and Filter Bar */}
      <View className="px-4 py-3 bg-gray-50">
        <View className="flex-row items-center bg-white rounded-lg px-3 py-2 mb-2 border border-gray-200">
          <Search size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-base"
            placeholder="Search services or technicians"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="flex-row justify-between">
          <TouchableOpacity
            className="flex-row items-center bg-white rounded-lg px-3 py-2 border border-gray-200"
            onPress={() => setFilterVisible(!filterVisible)}
          >
            <Filter size={18} color="#4B5563" />
            <Text className="ml-2 text-gray-700">Filter</Text>
            <ChevronDown size={16} color="#4B5563" className="ml-1" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center bg-white rounded-lg px-3 py-2 border border-gray-200">
            <Calendar size={18} color="#4B5563" />
            <Text className="ml-2 text-gray-700">Date Range</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Options */}
        {filterVisible && (
          <View className="mt-2 bg-white rounded-lg border border-gray-200 p-3">
            <TouchableOpacity
              className={`py-2 px-3 rounded-md mb-1 ${
                selectedFilter === "all" ? "bg-green-50" : ""
              }`}
              onPress={() => setSelectedFilter("all")}
            >
              <Text
                className={`${
                  selectedFilter === "all" ? "text-green-700" : "text-gray-700"
                }`}
              >
                All Services
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-2 px-3 rounded-md mb-1 ${
                selectedFilter === "completed" ? "bg-green-50" : ""
              }`}
              onPress={() => setSelectedFilter("completed")}
            >
              <Text
                className={`${
                  selectedFilter === "completed"
                    ? "text-green-700"
                    : "text-gray-700"
                }`}
              >
                Completed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-2 px-3 rounded-md ${
                selectedFilter === "cancelled" ? "bg-green-50" : ""
              }`}
              onPress={() => setSelectedFilter("cancelled")}
            >
              <Text
                className={`${
                  selectedFilter === "cancelled"
                    ? "text-green-700"
                    : "text-gray-700"
                }`}
              >
                Cancelled
              </Text>
            </TouchableOpacity>
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
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              className={`border-b border-gray-200 p-4 ${
                service.status === "cancelled" ? "bg-gray-50" : "bg-white"
              }`}
              onPress={() => toggleServiceExpansion(service.id)}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800">
                    {service.service?.name || "Unknown Service"}
                  </Text>
                  <Text className="text-gray-500">
                    {formatDate(service.scheduled_date)}
                  </Text>

                  {service.technician && (
                    <View className="flex-row items-center mt-2">
                      <Image
                        source={{
                          uri:
                            service.technician.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${service.technician.id}`,
                        }}
                        className="w-6 h-6 rounded-full bg-gray-200"
                      />
                      <Text className="ml-2 text-gray-700">
                        {service.technician.name}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="items-end">
                  <Text className="text-lg font-semibold text-gray-800">
                    {formatCurrency(service.price)}
                  </Text>
                  <View
                    className={`mt-1 px-2 py-1 rounded-full ${
                      service.status === "completed"
                        ? "bg-green-100"
                        : service.status === "cancelled"
                        ? "bg-red-100"
                        : "bg-blue-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        service.status === "completed"
                          ? "text-green-800"
                          : service.status === "cancelled"
                          ? "text-red-800"
                          : "text-blue-800"
                      }`}
                    >
                      {service.status.charAt(0).toUpperCase() +
                        service.status.slice(1)}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" className="mt-2" />
                </View>
              </View>

              {/* Expanded view */}
              {expandedService === service.id && (
                <View className="mt-4 pt-4 border-t border-gray-200">
                  {/* Before/After Images */}
                  {(service.before_image || service.after_image) && (
                    <View className="mb-4">
                      <Text className="font-semibold mb-2">Before/After</Text>
                      <View className="flex-row">
                        {service.before_image && (
                          <View className="flex-1 mr-2">
                            <Text className="text-xs text-gray-500 mb-1">
                              Before
                            </Text>
                            <Image
                              source={{ uri: service.before_image }}
                              className="w-full h-32 rounded-md bg-gray-200"
                              resizeMode="cover"
                            />
                          </View>
                        )}
                        {service.after_image && (
                          <View className="flex-1 ml-2">
                            <Text className="text-xs text-gray-500 mb-1">
                              After
                            </Text>
                            <Image
                              source={{ uri: service.after_image }}
                              className="w-full h-32 rounded-md bg-gray-200"
                              resizeMode="cover"
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Notes */}
                  {service.notes && (
                    <View className="mb-4">
                      <Text className="font-semibold mb-1">Service Notes</Text>
                      <Text className="text-gray-700">{service.notes}</Text>
                    </View>
                  )}

                  {/* Rating */}
                  {renderRatingStars(service)}
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-gray-500 mb-2">No service history found</Text>
            <Text className="text-gray-400 text-sm">
              Your completed services will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ServiceHistory;
