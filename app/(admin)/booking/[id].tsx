import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react-native";
import {
  getBooking,
  assignTechnician,
  updateBookingStatus,
  getTechnicians,
  Booking,
  Profile,
} from "../../../lib/data";
import { format, parseISO } from "date-fns";

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [techniciansLoading, setTechniciansLoading] = useState(false);
  const [showTechnicianList, setShowTechnicianList] = useState(false);
  const [statusOptions] = useState([
    "pending",
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
  ]);
  const [showStatusOptions, setShowStatusOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id || id === "undefined") {
      setError("No booking ID provided");
      setLoading(false);
      return;
    }
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      if (!id || id === "undefined") {
        throw new Error("Invalid booking ID");
      }

      setLoading(true);
      const bookingData = await getBooking(id as string);
      setBooking(bookingData);
    } catch (err) {
      console.error("Error fetching booking details:", err);
      setError("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      setTechniciansLoading(true);
      const technicianProfiles = await getTechnicians();
      setTechnicians(technicianProfiles);
    } catch (err) {
      console.error("Error fetching technicians:", err);
      Alert.alert("Error", "Failed to load technicians");
    } finally {
      setTechniciansLoading(false);
    }
  };

  const handleToggleTechniciansList = () => {
    if (!showTechnicianList && technicians.length === 0) {
      fetchTechnicians();
    }
    setShowTechnicianList(!showTechnicianList);
  };

  const handleToggleStatusOptions = () => {
    setShowStatusOptions(!showStatusOptions);
  };

  const handleAssignTechnician = async (technicianId: string) => {
    try {
      const updatedBooking = await assignTechnician(id as string, technicianId);
      setBooking(updatedBooking);
      setSuccess("Technician assigned successfully");
      setShowTechnicianList(false);
    } catch (err) {
      console.error("Error assigning technician:", err);
      Alert.alert("Error", "Failed to assign technician");
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      const updatedBooking = await updateBookingStatus(
        id as string,
        status as any
      );
      setBooking(updatedBooking);
      setSuccess(`Booking status updated to ${status}`);
      setShowStatusOptions(false);
    } catch (err) {
      console.error("Error updating booking status:", err);
      Alert.alert("Error", "Failed to update booking status");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: "Booking Details",
            headerBackTitle: "Back",
          }}
        />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-4 text-gray-600">Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: "Booking Details",
            headerBackTitle: "Back",
          }}
        />
        <View className="flex-1 justify-center items-center p-4">
          <AlertCircle size={48} color="#ef4444" />
          <Text className="mt-4 text-red-500 text-lg">{error}</Text>
          <TouchableOpacity
            onPress={fetchBooking}
            className="mt-4 bg-gray-200 px-4 py-2 rounded-md"
          >
            <Text>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: "Booking Details",
            headerBackTitle: "Back",
          }}
        />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Booking Details",
          headerBackTitle: "Back",
        }}
      />
      <ScrollView className="flex-1 p-4">
        {success && (
          <View className="mb-4 bg-green-100 p-3 rounded-md">
            <Text className="text-green-800">{success}</Text>
          </View>
        )}

        {/* Booking ID */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            Booking #{booking.id.slice(0, 8)}
          </Text>
          <View className="flex-row items-center mt-2">
            <View
              className={`px-3 py-1 rounded-full ${getStatusColor(
                booking.status
              )}`}
            >
              <Text className="text-sm font-medium capitalize">
                {booking.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Service Details */}
        <View className="mb-6 bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-semibold mb-3">Service Details</Text>
          <View className="flex-row items-center mb-2">
            <View className="w-8">
              <Calendar size={18} color="#4b5563" />
            </View>
            <Text className="text-gray-700">
              {format(new Date(booking.scheduled_date), "EEEE, MMMM d, yyyy")}
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <View className="w-8">
              <Clock size={18} color="#4b5563" />
            </View>
            <Text className="text-gray-700">{booking.scheduled_time}</Text>
          </View>
          <View className="flex-row items-center mb-2">
            <View className="w-8">
              <MapPin size={18} color="#4b5563" />
            </View>
            <Text className="text-gray-700">{booking.address}</Text>
          </View>
          <View className="pt-2 mt-2 border-t border-gray-200">
            <Text className="font-medium text-gray-800">
              {booking.service?.name}
            </Text>
            <Text className="text-gray-600 mt-1">
              ${Number(booking.price).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Customer Information */}
        <View className="mb-6 bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-semibold mb-3">Customer</Text>
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
              <User size={20} color="#4b5563" />
            </View>
            <View>
              <Text className="font-medium text-gray-800">
                {booking.customer?.first_name} {booking.customer?.last_name}
              </Text>
              <Text className="text-gray-600 text-sm">
                {booking.customer?.phone}
              </Text>
            </View>
          </View>
        </View>

        {/* Technician Assignment */}
        <View className="mb-6 bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-semibold mb-3">Technician</Text>
          {booking.technician ? (
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                <User size={20} color="#4b5563" />
              </View>
              <View>
                <Text className="font-medium text-gray-800">
                  {booking.technician.first_name} {booking.technician.last_name}
                </Text>
                <Text className="text-gray-600 text-sm">
                  {booking.technician.phone}
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-gray-600">No technician assigned</Text>
          )}

          <TouchableOpacity
            onPress={handleToggleTechniciansList}
            className="mt-3 flex-row items-center"
          >
            <Text className="text-blue-600 font-medium">
              {booking.technician ? "Change Technician" : "Assign Technician"}
            </Text>
            {showTechnicianList ? (
              <ChevronUp size={16} color="#2563eb" className="ml-1" />
            ) : (
              <ChevronDown size={16} color="#2563eb" className="ml-1" />
            )}
          </TouchableOpacity>

          {showTechnicianList && (
            <View className="mt-3 border border-gray-200 rounded-md">
              {techniciansLoading ? (
                <View className="p-4 items-center">
                  <ActivityIndicator size="small" color="#10b981" />
                  <Text className="mt-2 text-gray-600">
                    Loading technicians...
                  </Text>
                </View>
              ) : technicians.length === 0 ? (
                <View className="p-4 items-center">
                  <Text className="text-gray-600">No technicians found</Text>
                </View>
              ) : (
                technicians.map((technician) => (
                  <TouchableOpacity
                    key={technician.id}
                    onPress={() => handleAssignTechnician(technician.id)}
                    className="p-3 border-b border-gray-200 flex-row items-center"
                  >
                    <View className="w-8 h-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
                      <User size={16} color="#4b5563" />
                    </View>
                    <View>
                      <Text>
                        {technician.first_name} {technician.last_name}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        {technician.phone}
                      </Text>
                    </View>
                    {booking.technician_id === technician.id && (
                      <CheckCircle
                        size={16}
                        color="#10b981"
                        className="ml-auto"
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* Status Management */}
        <View className="mb-6 bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-semibold mb-3">Update Status</Text>
          <TouchableOpacity
            onPress={handleToggleStatusOptions}
            className="flex-row items-center justify-between"
          >
            <View
              className={`px-3 py-1 rounded-md ${getStatusColor(
                booking.status
              )}`}
            >
              <Text className="text-sm font-medium capitalize">
                {booking.status}
              </Text>
            </View>
            {showStatusOptions ? (
              <ChevronUp size={16} color="#4b5563" />
            ) : (
              <ChevronDown size={16} color="#4b5563" />
            )}
          </TouchableOpacity>

          {showStatusOptions && (
            <View className="mt-3 border border-gray-200 rounded-md">
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => handleUpdateStatus(status)}
                  className="p-3 border-b border-gray-200 flex-row items-center justify-between"
                >
                  <View
                    className={`px-3 py-1 rounded-md ${getStatusColor(status)}`}
                  >
                    <Text className="text-sm font-medium capitalize">
                      {status}
                    </Text>
                  </View>
                  {booking.status === status && (
                    <CheckCircle size={16} color="#10b981" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Additional Notes */}
        {booking.notes && (
          <View className="mb-6 bg-gray-50 p-4 rounded-lg">
            <Text className="text-lg font-semibold mb-2">Notes</Text>
            <Text className="text-gray-700">{booking.notes}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
