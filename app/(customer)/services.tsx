import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import ServicesList from "../components/customer/ServicesList";
import { TextInput } from "react-native-gesture-handler";
import { getAllServices } from "../lib/data";

const ServicesScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await getAllServices();

      if (error) {
        setError(error.message || "Failed to load services");
        return;
      }

      setServices(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      console.error("Error fetching services:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleServicePress = (id: string) => {
    // Navigate to booking screen with the selected service ID
    router.push({
      pathname: "/booking",
      params: { serviceId: id },
    });
  };

  const handleSearch = () => {
    setIsSearching(!isSearching);
  };

  const filteredServices = searchText
    ? services.filter(
        (service: any) =>
          service.name.toLowerCase().includes(searchText.toLowerCase()) ||
          service.description.toLowerCase().includes(searchText.toLowerCase())
      )
    : services;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-800">
            Lawn Care Services
          </Text>
          <Text className="text-gray-500 mt-1">
            Find and book the perfect service for your lawn
          </Text>
        </View>

        {/* Search Bar */}
        <View className="mx-4 mt-3 mb-2 flex-row items-center bg-gray-100 px-4 py-3 rounded-full">
          <Search size={20} color="#6B7280" />
          {isSearching ? (
            <TextInput
              className="ml-2 flex-1 text-gray-800"
              placeholder="Search services..."
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
          ) : (
            <TouchableOpacity className="flex-1" onPress={handleSearch}>
              <Text className="ml-2 text-gray-500">Search services...</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Services List */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#16a34a" />
            <Text className="mt-4 text-gray-600">Loading services...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center p-4">
            <Text className="text-red-500 mb-4">{error}</Text>
            <TouchableOpacity
              className="bg-green-500 px-6 py-3 rounded-lg"
              onPress={fetchServices}
            >
              <Text className="text-white font-semibold">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ServicesList
            services={filteredServices}
            onServicePress={handleServicePress}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ServicesScreen;
