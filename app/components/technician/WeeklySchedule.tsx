import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Calendar } from "lucide-react-native";

interface WeeklyScheduleProps {
  schedule?: {
    date: string;
    dayName: string;
    jobCount: number;
  }[];
  onDayPress?: (date: string) => void;
}

const WeeklySchedule = ({
  schedule = [
    { date: "2023-06-05", dayName: "Mon", jobCount: 4 },
    { date: "2023-06-06", dayName: "Tue", jobCount: 2 },
    { date: "2023-06-07", dayName: "Wed", jobCount: 5 },
    { date: "2023-06-08", dayName: "Thu", jobCount: 3 },
    { date: "2023-06-09", dayName: "Fri", jobCount: 1 },
    { date: "2023-06-10", dayName: "Sat", jobCount: 0 },
    { date: "2023-06-11", dayName: "Sun", jobCount: 0 },
  ],
  onDayPress = () => {},
}: WeeklyScheduleProps) => {
  const today = new Date().toISOString().split("T")[0];

  return (
    <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
      <View className="flex-row items-center mb-3">
        <Calendar size={20} color="#22c55e" />
        <Text className="text-lg font-semibold ml-2">Weekly Schedule</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row space-x-3 py-2">
          {schedule.map((day) => (
            <TouchableOpacity
              key={day.date}
              onPress={() => onDayPress(day.date)}
              className={`items-center justify-center w-16 h-20 rounded-lg p-2 ${day.date === today ? "bg-green-100 border border-green-500" : "bg-gray-50"}`}
            >
              <Text className="text-sm font-medium">{day.dayName}</Text>
              <Text
                className={`text-xl font-bold ${day.jobCount > 0 ? "text-green-600" : "text-gray-400"}`}
              >
                {day.jobCount}
              </Text>
              <Text className="text-xs text-gray-500">
                {day.jobCount === 1 ? "job" : "jobs"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default WeeklySchedule;
