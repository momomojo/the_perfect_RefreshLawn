import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Calendar, Clock, MapPin, ChevronRight } from "lucide-react-native";

interface AppointmentProps {
  appointments?: Array<{
    id: string;
    date: string;
    time: string;
    serviceType: string;
    address: string;
    status: "scheduled" | "in-progress" | "completed" | "pending" | "cancelled";
  }>;
  onViewAppointment?: (id: string) => void;
}

const UpcomingAppointments = ({
  appointments = [],
  onViewAppointment = (id) => console.log(`View appointment ${id}`),
}: AppointmentProps) => {
  return (
    <View className="bg-white rounded-xl p-4 shadow-md w-full">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-gray-800">
          Upcoming Appointments
        </Text>
        <TouchableOpacity>
          <Text className="text-green-600 font-semibold">View All</Text>
        </TouchableOpacity>
      </View>

      {appointments.length === 0 ? (
        <View className="py-8 items-center justify-center">
          <Text className="text-gray-500 text-center">
            No upcoming appointments
          </Text>
          <TouchableOpacity className="mt-4 bg-green-600 py-2 px-4 rounded-lg">
            <Text className="text-white font-semibold">Book a Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="max-h-48" showsVerticalScrollIndicator={false}>
          {appointments.map((appointment) => (
            <TouchableOpacity
              key={appointment.id}
              className="mb-3 p-3 border border-gray-200 rounded-lg flex-row justify-between items-center"
              onPress={() => onViewAppointment(appointment.id)}
            >
              <View className="flex-1">
                <Text className="font-semibold text-gray-800">
                  {appointment.serviceType}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Calendar size={14} color="#4B5563" />
                  <Text className="text-gray-600 text-xs ml-1">
                    {appointment.date}
                  </Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <Clock size={14} color="#4B5563" />
                  <Text className="text-gray-600 text-xs ml-1">
                    {appointment.time}
                  </Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <MapPin size={14} color="#4B5563" />
                  <Text className="text-gray-600 text-xs ml-1 flex-shrink">
                    {appointment.address}
                  </Text>
                </View>
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
