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
import { supabase } from "../../../utils/supabase";

interface ServiceProps {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  rating: number;
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
  rating,
  imageUrl,
  popular = false,
  onPress = () => {},
}: ServiceProps) => {
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
        <Text className="text-lg font-bold text-gray-800">{name}</Text>
        <Text className="text-gray-600 mt-1 mb-3" numberOfLines={2}>
          {description}
        </Text>

        <View className="flex-row justify-between items-center mt-2">
          <View className="flex-row items-center">
            <DollarSign size={16} color="#4CAF50" />
            <Text className="ml-1 text-gray-800 font-semibold">${price}</Text>
          </View>

          <View className="flex-row items-center">
            <Clock size={16} color="#607D8B" />
            <Text className="ml-1 text-gray-600">{duration}</Text>
          </View>

          <View className="flex-row items-center">
            <Star size={16} color="#FFC107" />
            <Text className="ml-1 text-gray-600">{rating}</Text>
          </View>
        </View>

        <TouchableOpacity
          className="bg-blue-500 py-3 rounded-lg mt-4 items-center"
          onPress={() => onPress(id)}
        >
          <Text className="text-white font-semibold">Book Now</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

interface ServicesListProps {
  services?: ServiceProps[];
  onServicePress?: (id: string) => void;
}

const ServicesList = ({
  services: propServices,
  onServicePress = (id) => console.log(`Service ${id} pressed`),
}: ServicesListProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceProps[]>([]);

  useEffect(() => {
    async function fetchServices() {
      try {
        setLoading(true);

        // If services are provided via props, use those
        if (propServices && propServices.length > 0) {
          setServices(propServices);
          setLoading(false);
          return;
        }

        // Otherwise fetch from Supabase
        const { data, error } = await supabase.from("services").select("*");

        if (error) {
          console.error("Error fetching services:", error.message);
          setError(error.message);
          return;
        }

        // Transform the data to match the ServiceProps interface
        const formattedServices = data.map((service: any) => ({
          id: service.id,
          name: service.name,
          description: service.description || "No description available",
          price: service.price || 0,
          duration: service.duration || "1 hour",
          rating: service.rating || 4.5,
          imageUrl:
            service.image_url ||
            "https://images.unsplash.com/photo-1589923188900-85dae523342b?w=800&q=80",
          popular: service.popular === true,
        }));

        setServices(formattedServices);
      } catch (err) {
        console.error("Error in fetchServices:", err);
        setError("Failed to load services. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, [propServices]);

  const [filter, setFilter] = useState("all");

  const filteredServices =
    filter === "all"
      ? services
      : filter === "popular"
      ? services.filter((service) => service.popular)
      : services;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-red-500">{error}</Text>
        <TouchableOpacity
          className="mt-4 bg-green-500 px-4 py-2 rounded-lg"
          onPress={() => setLoading(true)} // This will trigger the useEffect to run again
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (services.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-gray-500">
          No services available at the moment.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Filter options */}
      <View className="flex-row px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity
          className={`mr-3 px-4 py-2 rounded-full ${
            filter === "all" ? "bg-blue-500" : "bg-gray-200"
          }`}
          onPress={() => setFilter("all")}
        >
          <Text className={filter === "all" ? "text-white" : "text-gray-800"}>
            All Services
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-4 py-2 rounded-full ${
            filter === "popular" ? "bg-blue-500" : "bg-gray-200"
          }`}
          onPress={() => setFilter("popular")}
        >
          <Text
            className={filter === "popular" ? "text-white" : "text-gray-800"}
          >
            Popular
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {filteredServices.map((service) => (
          <ServiceCard key={service.id} {...service} onPress={onServicePress} />
        ))}
        <View className="h-20" /> {/* Bottom spacing */}
      </ScrollView>
    </View>
  );
};

export default ServicesList;
