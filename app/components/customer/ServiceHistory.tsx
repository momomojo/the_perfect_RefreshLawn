import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
} from "react-native";
import {
  Star,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  X,
} from "lucide-react-native";

interface ServiceHistoryItem {
  id: string;
  date: string;
  serviceType: string;
  technician: string;
  technicianAvatar: string;
  status: "completed" | "cancelled";
  price: string;
  rating?: number;
  beforeImage?: string;
  afterImage?: string;
  notes?: string;
}

interface ServiceHistoryProps {
  services?: ServiceHistoryItem[];
}

const ServiceHistory = ({ services = [] }: ServiceHistoryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // Default mock data if no services are provided
  const defaultServices: ServiceHistoryItem[] = [
    {
      id: "1",
      date: "May 15, 2023",
      serviceType: "Lawn Mowing",
      technician: "John Smith",
      technicianAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
      status: "completed",
      price: "$45.00",
      rating: 5,
      beforeImage:
        "https://images.unsplash.com/photo-1589848563524-2c3c17c9a9fa?w=400&q=75",
      afterImage:
        "https://images.unsplash.com/photo-1592150621744-aca64f48388a?w=400&q=75",
      notes:
        "Service completed on time. Customer requested extra attention to flower bed edges.",
    },
    {
      id: "2",
      date: "April 30, 2023",
      serviceType: "Hedge Trimming",
      technician: "Sarah Johnson",
      technicianAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      status: "completed",
      price: "$65.00",
      rating: 4,
      beforeImage:
        "https://images.unsplash.com/photo-1599685315640-4a9ced4b4c7f?w=400&q=75",
      afterImage:
        "https://images.unsplash.com/photo-1599685315007-d909b0ef5439?w=400&q=75",
      notes:
        "Trimmed all hedges as requested. Left clippings in compost bin as requested.",
    },
    {
      id: "3",
      date: "April 15, 2023",
      serviceType: "Lawn Mowing",
      technician: "John Smith",
      technicianAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
      status: "completed",
      price: "$45.00",
      rating: 5,
      beforeImage:
        "https://images.unsplash.com/photo-1558452919-08ae4aea8e29?w=400&q=75",
      afterImage:
        "https://images.unsplash.com/photo-1590212151175-e58edd96185b?w=400&q=75",
    },
    {
      id: "4",
      date: "March 28, 2023",
      serviceType: "Fertilization",
      technician: "Mike Wilson",
      technicianAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
      status: "cancelled",
      price: "$75.00",
    },
  ];

  const displayServices = services.length > 0 ? services : defaultServices;

  // Filter services based on search query and selected filter
  const filteredServices = displayServices.filter((service) => {
    const matchesSearch =
      service.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.technician.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedFilter === "all") return matchesSearch;
    if (selectedFilter === "completed")
      return matchesSearch && service.status === "completed";
    if (selectedFilter === "cancelled")
      return matchesSearch && service.status === "cancelled";
    return matchesSearch;
  });

  const toggleServiceExpansion = (id: string) => {
    if (expandedService === id) {
      setExpandedService(null);
    } else {
      setExpandedService(id);
    }
  };

  const renderRatingStars = (rating?: number) => {
    if (!rating) return null;

    return (
      <View className="flex-row mt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            fill={star <= rating ? "#FFD700" : "transparent"}
            color={star <= rating ? "#FFD700" : "#D1D5DB"}
          />
        ))}
      </View>
    );
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
              className={`py-2 px-3 rounded-md mb-1 ${selectedFilter === "all" ? "bg-green-50" : ""}`}
              onPress={() => setSelectedFilter("all")}
            >
              <Text
                className={`${selectedFilter === "all" ? "text-green-700" : "text-gray-700"}`}
              >
                All Services
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-2 px-3 rounded-md mb-1 ${selectedFilter === "completed" ? "bg-green-50" : ""}`}
              onPress={() => setSelectedFilter("completed")}
            >
              <Text
                className={`${selectedFilter === "completed" ? "text-green-700" : "text-gray-700"}`}
              >
                Completed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-2 px-3 rounded-md ${selectedFilter === "cancelled" ? "bg-green-50" : ""}`}
              onPress={() => setSelectedFilter("cancelled")}
            >
              <Text
                className={`${selectedFilter === "cancelled" ? "text-green-700" : "text-gray-700"}`}
              >
                Cancelled
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Service History List */}
      <ScrollView className="flex-1">
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              className={`border-b border-gray-200 p-4 ${service.status === "cancelled" ? "bg-gray-50" : "bg-white"}`}
              onPress={() => toggleServiceExpansion(service.id)}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800">
                    {service.serviceType}
                  </Text>
                  <Text className="text-gray-500">{service.date}</Text>

                  <View className="flex-row items-center mt-2">
                    <Image
                      source={{ uri: service.technicianAvatar }}
                      className="w-6 h-6 rounded-full bg-gray-200"
                    />
                    <Text className="ml-2 text-gray-700">
                      {service.technician}
                    </Text>
                  </View>

                  {service.status === "completed" &&
                    renderRatingStars(service.rating)}
                </View>

                <View className="items-end">
                  <Text className="text-lg font-semibold text-gray-800">
                    {service.price}
                  </Text>
                  <View
                    className={`mt-1 px-2 py-1 rounded-full ${service.status === "completed" ? "bg-green-100" : "bg-red-100"}`}
                  >
                    <Text
                      className={`text-xs font-medium ${service.status === "completed" ? "text-green-800" : "text-red-800"}`}
                    >
                      {service.status.charAt(0).toUpperCase() +
                        service.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expanded View */}
              {expandedService === service.id &&
                service.status === "completed" && (
                  <View className="mt-4 pt-4 border-t border-gray-200">
                    {(service.beforeImage || service.afterImage) && (
                      <View className="flex-row justify-between mb-4">
                        {service.beforeImage && (
                          <View className="flex-1 mr-2">
                            <Text className="text-xs text-gray-500 mb-1">
                              Before
                            </Text>
                            <Image
                              source={{ uri: service.beforeImage }}
                              className="w-full h-32 rounded-lg bg-gray-200"
                            />
                          </View>
                        )}
                        {service.afterImage && (
                          <View className="flex-1 ml-2">
                            <Text className="text-xs text-gray-500 mb-1">
                              After
                            </Text>
                            <Image
                              source={{ uri: service.afterImage }}
                              className="w-full h-32 rounded-lg bg-gray-200"
                            />
                          </View>
                        )}
                      </View>
                    )}

                    {service.notes && (
                      <View className="mb-3">
                        <Text className="text-sm font-medium text-gray-700 mb-1">
                          Notes:
                        </Text>
                        <Text className="text-gray-600">{service.notes}</Text>
                      </View>
                    )}

                    {!service.rating && (
                      <TouchableOpacity className="bg-green-600 py-2 px-4 rounded-lg items-center">
                        <Text className="text-white font-medium">
                          Rate this service
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
            </TouchableOpacity>
          ))
        ) : (
          <View className="p-8 items-center justify-center">
            <Text className="text-gray-500 text-center">
              No service history found
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ServiceHistory;
