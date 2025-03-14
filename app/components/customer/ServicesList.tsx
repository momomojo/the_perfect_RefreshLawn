import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Bookmark, Clock, DollarSign, Info, Star } from "lucide-react-native";

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
  services = [
    {
      id: "1",
      name: "Standard Lawn Mowing",
      description:
        "Professional lawn mowing service including edging and cleanup. Perfect for regular maintenance of your yard.",
      price: 45,
      duration: "1 hour",
      rating: 4.8,
      imageUrl:
        "https://images.unsplash.com/photo-1589923188900-85dae523342b?w=800&q=80",
      popular: true,
    },
    {
      id: "2",
      name: "Garden Bed Maintenance",
      description:
        "Complete garden bed service including weeding, mulching, and plant care to keep your garden looking its best.",
      price: 75,
      duration: "2 hours",
      rating: 4.6,
      imageUrl:
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
    },
    {
      id: "3",
      name: "Hedge Trimming",
      description:
        "Professional hedge trimming and shaping to maintain the beauty and health of your landscape features.",
      price: 60,
      duration: "1.5 hours",
      rating: 4.7,
      imageUrl:
        "https://images.unsplash.com/photo-1598902108854-0e05b1a4b325?w=800&q=80",
    },
    {
      id: "4",
      name: "Seasonal Cleanup",
      description:
        "Comprehensive yard cleanup including leaf removal, branch pickup, and debris disposal.",
      price: 120,
      duration: "3 hours",
      rating: 4.9,
      imageUrl:
        "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800&q=80",
      popular: true,
    },
    {
      id: "5",
      name: "Fertilization Treatment",
      description:
        "Professional lawn fertilization to promote healthy growth and vibrant color throughout the season.",
      price: 85,
      duration: "1 hour",
      rating: 4.5,
      imageUrl:
        "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&q=80",
    },
  ],
  onServicePress = (id) => console.log(`Service ${id} pressed`),
}: ServicesListProps) => {
  const [filter, setFilter] = useState("all");

  const filteredServices =
    filter === "all"
      ? services
      : filter === "popular"
        ? services.filter((service) => service.popular)
        : services;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Filter options */}
      <View className="flex-row px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity
          className={`mr-3 px-4 py-2 rounded-full ${filter === "all" ? "bg-blue-500" : "bg-gray-200"}`}
          onPress={() => setFilter("all")}
        >
          <Text className={filter === "all" ? "text-white" : "text-gray-800"}>
            All Services
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-4 py-2 rounded-full ${filter === "popular" ? "bg-blue-500" : "bg-gray-200"}`}
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
