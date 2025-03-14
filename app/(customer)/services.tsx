import React from "react";
import { View, Text, SafeAreaView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import ServicesList from "../components/customer/ServicesList";

const ServicesScreen = () => {
  const router = useRouter();

  const handleServicePress = (id: string) => {
    // Navigate to booking screen with the selected service ID
    router.push({
      pathname: "/booking",
      params: { serviceId: id },
    });
  };

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
        <TouchableOpacity
          className="mx-4 mt-3 mb-2 flex-row items-center bg-gray-100 px-4 py-3 rounded-full"
          onPress={() => console.log("Search pressed")}
        >
          <Search size={20} color="#6B7280" />
          <Text className="ml-2 text-gray-500">Search services...</Text>
        </TouchableOpacity>

        {/* Services List */}
        <ServicesList onServicePress={handleServicePress} />
      </View>
    </SafeAreaView>
  );
};

export default ServicesScreen;
