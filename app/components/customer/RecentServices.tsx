import React from "react";
import { View, Text, Image, ScrollView, TouchableOpacity } from "react-native";
import { Star } from "lucide-react-native";

interface ServiceItem {
  id: string;
  date: string;
  serviceType: string;
  technician: string;
  beforeImage: string;
  afterImage: string;
  isRated: boolean;
  rating?: number;
}

interface RecentServicesProps {
  services?: ServiceItem[];
  onRateService?: (id: string, rating: number) => void;
  onViewDetails?: (id: string) => void;
}

const RecentServices = ({
  services = [],
  onRateService = () => {},
  onViewDetails = () => {},
}: RecentServicesProps) => {
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const renderRatingStars = (serviceId: string, currentRating?: number) => {
    return (
      <View className="flex-row mt-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRateService(serviceId, star)}
            className="mr-1"
          >
            <Star
              size={20}
              color={
                currentRating && star <= currentRating ? "#FFD700" : "#D1D5DB"
              }
              fill={
                currentRating && star <= currentRating
                  ? "#FFD700"
                  : "transparent"
              }
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View className="bg-white rounded-lg p-4 shadow-sm w-full">
      <Text className="text-lg font-bold mb-4">Recent Services</Text>

      {services.length === 0 ? (
        <View className="py-8 items-center">
          <Text className="text-gray-500">No recent services</Text>
        </View>
      ) : (
        <ScrollView className="max-h-[250px]">
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              className="mb-4 border-b border-gray-200 pb-4"
              onPress={() => onViewDetails(service.id)}
            >
              <Text className="font-medium text-base">
                {service.serviceType}
              </Text>
              <Text className="text-gray-600 text-sm mb-2">
                {formatDate(service.date)} • {service.technician}
              </Text>

              <View className="flex-row justify-between">
                <View className="w-[48%]">
                  <Text className="text-xs text-gray-500 mb-1">Before</Text>
                  <Image
                    source={{ uri: service.beforeImage }}
                    className="w-full h-24 rounded-md bg-gray-200"
                  />
                </View>
                <View className="w-[48%]">
                  <Text className="text-xs text-gray-500 mb-1">After</Text>
                  <Image
                    source={{ uri: service.afterImage }}
                    className="w-full h-24 rounded-md bg-gray-200"
                  />
                </View>
              </View>

              {!service.isRated ? (
                <View className="mt-2">
                  <Text className="text-sm text-gray-600 mb-1">
                    Rate this service:
                  </Text>
                  {renderRatingStars(service.id)}
                </View>
              ) : (
                <View className="mt-2">
                  <Text className="text-sm text-gray-600 mb-1">
                    Your rating:
                  </Text>
                  {renderRatingStars(service.id, service.rating)}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default RecentServices;
