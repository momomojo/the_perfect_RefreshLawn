import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Calendar, Clock, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Booking } from "../../../lib/data";
import { format } from "date-fns";

interface UpcomingAppointmentsProps {
  appointments?: Booking[];
  onViewAppointment?: (id: string) => void;
}

const UpcomingAppointments = ({
  appointments = [],
  onViewAppointment,
}: UpcomingAppointmentsProps) => {
  const router = useRouter();

  // Format time from 24-hour to 12-hour format
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, "h:mm a");
    } catch (err) {
      console.error("Error formatting time:", err);
      return timeString;
    }
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "EEE, MMM d");
    } catch (err) {
      console.error("Error formatting date:", err);
      return dateString;
    }
  };

  const handleViewAll = () => {
    router.push("/(customer)/history");
  };

  const handleBook = () => {
    router.push("/(customer)/services");
  };

  return (
    <View className="bg-white rounded-xl p-4 shadow-md w-full">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-gray-800">
          Upcoming Appointments
        </Text>
        <TouchableOpacity onPress={handleViewAll}>
          <Text className="text-green-600 font-semibold">View All</Text>
        </TouchableOpacity>
      </View>

      {appointments.length === 0 ? (
        <View className="py-8 items-center justify-center">
          <Text className="text-gray-500 text-center">
            No upcoming appointments
          </Text>
          <TouchableOpacity
            className="mt-4 bg-green-600 py-2 px-4 rounded-lg"
            onPress={handleBook}
          >
            <Text className="text-white font-semibold">Book a Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="max-h-48" showsVerticalScrollIndicator={false}>
          {appointments.map((appointment) => (
            <TouchableOpacity
              key={appointment.id}
              className="mb-3 p-3 border border-gray-200 rounded-lg flex-row justify-between items-center"
              onPress={() =>
                onViewAppointment ? onViewAppointment(appointment.id) : null
              }
            >
              <View className="flex-1">
                <Text className="font-semibold text-gray-800">
                  {appointment.service?.name || "Unknown Service"}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Calendar size={14} color="#4B5563" />
                  <Text className="text-gray-600 text-xs ml-1">
                    {formatDate(appointment.scheduled_date)}
                  </Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <Clock size={14} color="#4B5563" />
                  <Text className="text-gray-600 text-xs ml-1">
                    {formatTime(appointment.scheduled_time)}
                  </Text>
                </View>
                <Text className="text-gray-600 text-xs mt-1">
                  ${appointment.price.toFixed(2)}
                </Text>
                <Text
                  className={`text-xs mt-1 ${
                    appointment.status === "scheduled"
                      ? "text-green-600"
                      : appointment.status === "pending"
                      ? "text-yellow-600"
                      : "text-gray-600"
                  }`}
                >
                  {appointment.status.charAt(0).toUpperCase() +
                    appointment.status.slice(1).replace("_", " ")}
                </Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default UpcomingAppointments;
