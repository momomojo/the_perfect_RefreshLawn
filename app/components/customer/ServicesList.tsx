import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Bookmark, Clock, DollarSign, Info, Star } from "lucide-react-native";
import { Service } from "../../../lib/data";

interface ServiceCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  imageUrl: string;
  popular?: boolean;
  onPress?: (id: string) => void;
}

const ServiceCard = ({
  id,
  name,
  description,
  price,
  duration,
  imageUrl,
  popular = false,
  onPress = () => {},
}: ServiceCardProps) => {
  return (
    <Pressable
      className="bg-white rounded-xl mb-4 overflow-hidden shadow-sm border border-gray-100"
      onPress={() => onPress(id)}
    >
      <View className="relative">
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-48"
          resizeMode="cover"
        />
        {popular && (
          <View className="absolute top-2 right-2 bg-green-500 px-2 py-1 rounded-full">
            <Text className="text-white text-xs font-medium">Popular</Text>
          </View>
        )}
      </View>

      <View className="p-4">
        <Text className="text-xl font-bold text-gray-800">{name}</Text>
        <Text className="text-gray-600 text-sm mt-1 mb-2" numberOfLines={2}>
          {description}
        </Text>

        <View className="flex-row justify-between mt-2">
          <View className="flex-row items-center">
            <DollarSign size={16} color="#16a34a" />
            <Text className="text-green-600 font-bold ml-1">
              ${price.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Clock size={16} color="#6b7280" />
            <Text className="text-gray-600 ml-1">{duration}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

interface ServicesListProps {
  services: Service[];
  onServicePress?: (id: string) => void;
}

const ServicesList = ({
  services,
  onServicePress = (id) => console.log(`Service ${id} pressed`),
}: ServicesListProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to format service duration
  const formatDuration = (minutes: number | undefined): string => {
    if (!minutes) return "1 hour";

    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours} hr ${remainingMinutes} min`
        : `${hours} hour${hours > 1 ? "s" : ""}`;
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="text-gray-600 mt-4">Loading services...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-red-500 text-center mb-4">{error}</Text>
      </View>
    );
  }

  if (!services || services.length === 0) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Info size={40} color="#9ca3af" />
        <Text className="text-gray-500 text-center mt-4">
          No services available at the moment. Please check back later.
        </Text>
      </View>
    );
  }

  // Find popular services (for now, we'll consider the most expensive services as popular)
  const popularServices = [...services]
    .sort((a, b) => b.base_price - a.base_price)
    .slice(0, 2);
  const popularIds = popularServices.map((service) => service.id);

  return (
    <ScrollView className="flex-1 px-4 py-3">
      <Text className="text-lg font-medium text-gray-700 mb-3">
        Our Services
      </Text>

      {services.map((service) => (
        <ServiceCard
          key={service.id}
          id={service.id}
          name={service.name}
          description={service.description || "No description available"}
          price={service.base_price}
          duration={formatDuration(service.duration_minutes)}
          imageUrl={
            service.image_url ||
            "https://images.unsplash.com/photo-1589923188900-85dae523342b?w=800&q=80"
          }
          popular={popularIds.includes(service.id)}
          onPress={onServicePress}
        />
      ))}
    </ScrollView>
  );
};

export default ServicesList;
