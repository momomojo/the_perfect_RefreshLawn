import React from "react";
import { View, Text, Image, ScrollView, TouchableOpacity } from "react-native";
import { Star, Calendar } from "lucide-react-native";
import { Booking } from "../../../lib/data";
import { format } from "date-fns";

interface RecentServicesProps {
  services?: Booking[];
  onRateService?: (id: string, rating: number) => void;
  onViewDetails?: (id: string) => void;
}

const RecentServices = ({
  services = [],
  onRateService = () => {},
  onViewDetails = () => {},
}: RecentServicesProps) => {
  // Format date to readable format
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch (err) {
      console.error("Error formatting date:", err);
      return dateString;
    }
  };

  const renderRatingStars = (booking: Booking) => {
    const currentRating = booking.review?.rating || 0;

    return (
      <View className="flex-row mt-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRateService(booking.id, star)}
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
                {service.service?.name || "Unknown Service"}
              </Text>
              <View className="flex-row items-center">
                <Calendar size={14} color="#6b7280" />
                <Text className="text-gray-600 text-sm ml-1 mb-2">
                  {formatDate(service.scheduled_date)}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <View className="w-[48%]">
                  <Text className="text-xs text-gray-500 mb-1">Before</Text>
                  <Image
                    source={{
                      uri: "https://images.unsplash.com/photo-1589923188900-85dae523342b?w=400&q=80",
                    }}
                    className="w-full h-24 rounded-md bg-gray-200"
                  />
                </View>
                <View className="w-[48%]">
                  <Text className="text-xs text-gray-500 mb-1">After</Text>
                  <Image
                    source={{
                      uri: "https://images.unsplash.com/photo-1632771918880-37ca331d3429?w=400&q=80",
                    }}
                    className="w-full h-24 rounded-md bg-gray-200"
                  />
                </View>
              </View>

              {!service.review ? (
                <View className="mt-2">
                  <Text className="text-sm text-gray-600 mb-1">
                    Rate this service:
                  </Text>
                  {renderRatingStars(service)}
                </View>
              ) : (
                <View className="mt-2">
                  <Text className="text-sm text-gray-600 mb-1">
                    Your rating:
                  </Text>
                  {renderRatingStars(service)}
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
