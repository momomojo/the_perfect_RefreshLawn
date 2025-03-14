import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Calendar,
  Info,
  Clipboard,
  Home,
  User,
} from "lucide-react-native";

interface JobDetailProps {
  jobId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  serviceType?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedDuration?: string;
  propertySize?: string;
  specialInstructions?: string;
  propertyImage?: string;
  status?: "scheduled" | "in-progress" | "completed" | "cancelled";
}

const JobDetail = ({
  jobId = "JOB-1234",
  customerName = "John Smith",
  customerPhone = "(555) 123-4567",
  customerEmail = "john.smith@example.com",
  address = "123 Lawn Avenue, Green City, GC 12345",
  serviceType = "Standard Lawn Mowing",
  scheduledDate = "June 15, 2023",
  scheduledTime = "10:00 AM - 12:00 PM",
  estimatedDuration = "2 hours",
  propertySize = "0.25 acres",
  specialInstructions = "Please use the side gate. Dog will be kept inside during service. Extra attention needed around flower beds.",
  propertyImage = "https://images.unsplash.com/photo-1560749003-f4b1e17e2dfd?w=600&q=80",
  status = "scheduled",
}: JobDetailProps) => {
  const getStatusColor = () => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "scheduled":
        return "Scheduled";
      case "in-progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        {/* Header with Job ID and Status */}
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-sm text-gray-500">Job ID</Text>
            <Text className="text-lg font-bold">{jobId}</Text>
          </View>
          <View className={`px-3 py-1 rounded-full ${getStatusColor()}`}>
            <Text className={`font-medium`}>{getStatusText()}</Text>
          </View>
        </View>

        {/* Property Image */}
        <View className="mb-6 rounded-lg overflow-hidden">
          <Image
            source={{ uri: propertyImage }}
            className="w-full h-48 rounded-lg"
            resizeMode="cover"
          />
        </View>

        {/* Service Details Section */}
        <View className="mb-6 bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-bold mb-3">Service Details</Text>

          <View className="flex-row items-center mb-3">
            <Clipboard size={20} color="#4b5563" />
            <View className="ml-3">
              <Text className="text-gray-500">Service Type</Text>
              <Text className="font-medium">{serviceType}</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-3">
            <Calendar size={20} color="#4b5563" />
            <View className="ml-3">
              <Text className="text-gray-500">Date</Text>
              <Text className="font-medium">{scheduledDate}</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-3">
            <Clock size={20} color="#4b5563" />
            <View className="ml-3">
              <Text className="text-gray-500">Time</Text>
              <Text className="font-medium">{scheduledTime}</Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <Clock size={20} color="#4b5563" />
            <View className="ml-3">
              <Text className="text-gray-500">Estimated Duration</Text>
              <Text className="font-medium">{estimatedDuration}</Text>
            </View>
          </View>
        </View>

        {/* Property Details Section */}
        <View className="mb-6 bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-bold mb-3">Property Details</Text>

          <View className="flex-row items-center mb-3">
            <MapPin size={20} color="#4b5563" />
            <View className="ml-3">
              <Text className="text-gray-500">Address</Text>
              <Text className="font-medium">{address}</Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <Home size={20} color="#4b5563" />
            <View className="ml-3">
              <Text className="text-gray-500">Property Size</Text>
              <Text className="font-medium">{propertySize}</Text>
            </View>
          </View>
        </View>

        {/* Customer Information Section */}
        <View className="mb-6 bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-bold mb-3">Customer Information</Text>

          <View className="flex-row items-center mb-3">
            <User size={20} color="#4b5563" />
            <View className="ml-3">
              <Text className="text-gray-500">Name</Text>
              <Text className="font-medium">{customerName}</Text>
            </View>
          </View>

          <TouchableOpacity className="flex-row items-center mb-3">
            <Phone size={20} color="#4b5563" />
            <View className="ml-3">
              <Text className="text-gray-500">Phone</Text>
              <Text className="font-medium text-blue-600">{customerPhone}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center">
            <Mail size={20} color="#4b5563" />
            <View className="ml-3">
              <Text className="text-gray-500">Email</Text>
              <Text className="font-medium text-blue-600">{customerEmail}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Special Instructions Section */}
        <View className="mb-6 bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-bold mb-3">Special Instructions</Text>

          <View className="flex-row">
            <Info size={20} color="#4b5563" className="mt-1" />
            <Text className="ml-3 text-gray-700">{specialInstructions}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default JobDetail;
